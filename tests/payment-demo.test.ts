import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { UserRole, BookingStatus, PaymentStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';

const app = createApp();

// Payment Demo flow: intent (PENDING bill + VA/QR instructions) -> pay (settle).
// Covers: idempotent intent, VA/QRIS artefacts, double-click safety,
// attendee-count validation, legacy single-step /pay compatibility.
describe('Payment Demo Flow (intent -> pay)', () => {
  let ownerToken: string;
  let strangerToken: string;
  let ownerId: string;
  let strangerId: string;
  let eventId: string;
  let tierAId: string;
  let tierBId: string;
  let bookingId: string;
  let bookingCode: string;

  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_jwt_auth_testing_key_123';
  const sign = (id: string, email: string, role: UserRole) =>
    jwt.sign({ id, email, role }, jwtSecret, { expiresIn: '1h' });

  beforeAll(async () => {
    const suffix = Date.now();
    const owner = await prisma.user.create({
      data: {
        email: `paydemo_owner_${suffix}@test.com`,
        name: 'Paydemo Owner',
        passwordHash: 'dummy_hash',
        role: UserRole.ATTENDEE,
      },
    });
    const stranger = await prisma.user.create({
      data: {
        email: `paydemo_stranger_${suffix}@test.com`,
        name: 'Paydemo Stranger',
        passwordHash: 'dummy_hash',
        role: UserRole.ATTENDEE,
      },
    });
    ownerId = owner.id;
    strangerId = stranger.id;
    ownerToken = sign(owner.id, owner.email, owner.role);
    strangerToken = sign(stranger.id, stranger.email, stranger.role);

    const event = await prisma.event.create({
      data: {
        organizerId: owner.id,
        title: 'Paydemo Show',
        slug: `paydemo-show-${suffix}`,
        venueName: 'Paydemo Arena',
        eventDate: new Date('2026-12-01T19:00:00Z'),
      },
    });
    eventId = event.id;

    const tierA = await prisma.ticketTier.create({
      data: { eventId: event.id, name: 'Tier A', price: 100000, totalQuota: 10, availableQuota: 10 },
    });
    const tierB = await prisma.ticketTier.create({
      data: { eventId: event.id, name: 'Tier B', price: 200000, totalQuota: 10, availableQuota: 10 },
    });
    tierAId = tierA.id;
    tierBId = tierB.id;

    const booking = await prisma.booking.create({
      data: {
        userId: owner.id,
        eventId: event.id,
        bookingCode: `PAYDEMO-${suffix}`,
        totalAmount: 400000,
        status: BookingStatus.PENDING,
        expiresAt: new Date(Date.now() + 3600000),
        bookingItems: {
          create: [
            { ticketTierId: tierA.id, quantity: 2, unitPrice: 100000, subtotal: 200000 },
            { ticketTierId: tierB.id, quantity: 1, unitPrice: 200000, subtotal: 200000 },
          ],
        },
      },
    });
    bookingId = booking.id;
    bookingCode = booking.bookingCode;
  });

  afterAll(async () => {
    if (bookingId) {
      await prisma.ticket.deleteMany({ where: { bookingId } });
      await prisma.bookingItem.deleteMany({ where: { bookingId } });
      await prisma.paymentTransaction.deleteMany({ where: { bookingId } });
      await prisma.booking.deleteMany({ where: { id: bookingId } });
    }
    if (tierAId) await prisma.ticketTier.deleteMany({ where: { id: tierAId } });
    if (tierBId) await prisma.ticketTier.deleteMany({ where: { id: tierBId } });
    if (eventId) await prisma.event.deleteMany({ where: { id: eventId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, strangerId] } } });
  });

  it('POST /payments/intent tanpa token → 401', async () => {
    const res = await request(app).post('/api/v1/payments/intent').send({
      bookingCode,
      paymentMethod: 'QRIS',
    });
    expect(res.status).toBe(401);
  });

  it('POST /payments/intent milik orang lain → 403', async () => {
    const res = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ bookingCode, paymentMethod: 'QRIS' });
    expect(res.status).toBe(403);
  });

  it('POST /payments/intent QRIS → 200 + qrPayload + status PENDING', async () => {
    const res = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bookingCode, paymentMethod: 'QRIS' });
    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe(PaymentStatus.PENDING);
    expect(res.body.data.payment.instruction.qrPayload).toContain(bookingCode);
  });

  it('POST /payments/intent 2x (double-click) → tagihan SAMA, tidak ganda', async () => {
    const first = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bookingCode, paymentMethod: 'QRIS' });
    const second = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bookingCode, paymentMethod: 'VA' }); // beda metode pun tetap reuse
    expect(second.status).toBe(200);
    expect(second.body.data.payment.id).toBe(first.body.data.payment.id);
    const count = await prisma.paymentTransaction.count({
      where: { bookingId, status: PaymentStatus.PENDING },
    });
    expect(count).toBe(1);
  });

  it('GET /payments/intent/:code → status tagihan terbaru', async () => {
    const res = await request(app)
      .get(`/api/v1/payments/intent/${bookingCode}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.bookingCode).toBe(bookingCode);
    expect(res.body.data.payment.status).toBe(PaymentStatus.PENDING);
  });

  it('POST /payments/pay jumlah attendees salah → 400 jujur (bukan silent fallback)', async () => {
    const res = await request(app)
      .post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bookingCode,
        paymentMethod: 'QRIS',
        attendees: [{ ticketTierId: tierAId, name: 'Satu Orang', email: 'satu@test.com' }], // harusnya 3
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /payments/pay dengan attendees pas → 200 + 3 tiket via createMany', async () => {
    const res = await request(app)
      .post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bookingCode,
        paymentMethod: 'QRIS',
        attendees: [
          { ticketTierId: tierAId, name: 'Orang 1', email: 'o1@test.com' },
          { ticketTierId: tierAId, name: 'Orang 2', email: 'o2@test.com' },
          { ticketTierId: tierBId, name: 'Orang 3', email: 'o3@test.com' },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.ticketsCount).toBe(3);
    const tickets = await prisma.ticket.findMany({ where: { bookingId } });
    expect(tickets.length).toBe(3);
    expect(new Set(tickets.map((t) => t.qrHash)).size).toBe(3);
  });

  it('POST /payments/pay ulang setelah PAID → 200 idempotent, tiket tetap 3', async () => {
    const res = await request(app)
      .post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bookingCode, paymentMethod: 'QRIS' });
    expect(res.status).toBe(200);
    expect(res.body.data.alreadySettled).toBe(true);
    const tickets = await prisma.ticket.findMany({ where: { bookingId } });
    expect(tickets.length).toBe(3);
  });
});
