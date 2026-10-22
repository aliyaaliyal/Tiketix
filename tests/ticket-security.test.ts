import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { UserRole, BookingStatus, TicketStatus, PaymentStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';

const app = createApp();

describe('Ticket Security & Gate Check-in Tests', () => {
  let organizerToken: string;
  let attendeeAToken: string;
  let attendeeBToken: string;

  let organizerId: string;
  let attendeeAId: string;
  let attendeeBId: string;

  let eventId: string;
  let tierId: string;
  let bookingId: string;
  let ticketId: string;
  let ticketQrHash: string;

  beforeAll(async () => {
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_jwt_auth_testing_key_123';

    // 1. Create Test Organizer
    const organizer = await prisma.user.create({
      data: {
        email: `org_${Date.now()}@test.com`,
        name: 'Test Organizer',
        passwordHash: 'dummy_hash',
        role: UserRole.ORGANIZER,
      },
    });
    organizerId = organizer.id;
    organizerToken = jwt.sign({ id: organizer.id, email: organizer.email, role: organizer.role }, jwtSecret, { expiresIn: '1h' });

    // 2. Create Attendee A (Ticket Owner)
    const attendeeA = await prisma.user.create({
      data: {
        email: `attA_${Date.now()}@test.com`,
        name: 'Attendee Owner A',
        passwordHash: 'dummy_hash',
        role: UserRole.ATTENDEE,
      },
    });
    attendeeAId = attendeeA.id;
    attendeeAToken = jwt.sign({ id: attendeeA.id, email: attendeeA.email, role: attendeeA.role }, jwtSecret, { expiresIn: '1h' });

    // 3. Create Attendee B (Unauthorized Third Party)
    const attendeeB = await prisma.user.create({
      data: {
        email: `attB_${Date.now()}@test.com`,
        name: 'Attendee Intruder B',
        passwordHash: 'dummy_hash',
        role: UserRole.ATTENDEE,
      },
    });
    attendeeBId = attendeeB.id;
    attendeeBToken = jwt.sign({ id: attendeeB.id, email: attendeeB.email, role: attendeeB.role }, jwtSecret, { expiresIn: '1h' });

    // 4. Create Event & Tier
    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: 'Security Concert Test',
        slug: `sec-concert-${Date.now()}`,
        description: 'Test Event for Security Audit',
        venueName: 'GBK Test Arena',
        venueAddress: 'Senayan Jakarta',
        eventDate: new Date('2026-12-01T19:00:00Z'),
      },
    });
    eventId = event.id;

    const tier = await prisma.ticketTier.create({
      data: {
        eventId: event.id,
        name: 'VIP Security Pass',
        price: 500000,
        totalQuota: 50,
        availableQuota: 50,
      },
    });
    tierId = tier.id;

    // 5. Create Booking & Ticket for Attendee A
    const booking = await prisma.booking.create({
      data: {
        userId: attendeeA.id,
        eventId: event.id,
        bookingCode: `BK-SEC-${Date.now()}`,
        totalAmount: 500000,
        status: BookingStatus.CONFIRMED,
        expiresAt: new Date(Date.now() + 3600000),
        bookingItems: {
          create: {
            ticketTierId: tier.id,
            quantity: 1,
            unitPrice: 500000,
            subtotal: 500000,
          },
        },
      },
      include: {
        bookingItems: true,
      },
    });
    bookingId = booking.id;
    const bookingItemId = booking.bookingItems[0].id;

    ticketQrHash = `qr-hash-test-${Date.now()}`;
    const ticket = await prisma.ticket.create({
      data: {
        booking: { connect: { id: booking.id } },
        bookingItem: { connect: { id: bookingItemId } },
        ticketTier: { connect: { id: tier.id } },
        ticketCode: `TKT-SEC-${Date.now()}`,
        qrHash: ticketQrHash,
        attendeeName: attendeeA.name,
        attendeeEmail: attendeeA.email,
        status: TicketStatus.ACTIVE,
      },
    });
    ticketId = ticket.id;
  });

  afterAll(async () => {
    // Cleanup cascade
    if (ticketId) await prisma.ticket.deleteMany({ where: { bookingId } });
    if (bookingId) {
      await prisma.bookingItem.deleteMany({ where: { bookingId } });
      await prisma.booking.deleteMany({ where: { id: bookingId } });
    }
    if (tierId) await prisma.ticketTier.deleteMany({ where: { id: tierId } });
    if (eventId) await prisma.event.deleteMany({ where: { id: eventId } });
    await prisma.user.deleteMany({
      where: { id: { in: [organizerId, attendeeAId, attendeeBId] } },
    });
  });

  it('GET /api/v1/tickets/:id - should REJECT unauthenticated access with 401 (CRIT-02 Guard)', async () => {
    const res = await request(app).get(`/api/v1/tickets/${ticketId}`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/tickets/:id - should REJECT access from unauthorized attendee with 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${attendeeBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/tickets/:id - should ALLOW ticket owner to view their ticket with 200 OK', async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${attendeeAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(ticketId);
    expect(res.body.data.ticketCode).toBeDefined();
    expect(res.body.data.qrHash).toBe(ticketQrHash);
  });

  it('GET /api/v1/tickets/my-tickets - should return all tickets owned by attendee', async () => {
    const res = await request(app)
      .get('/api/v1/tickets/my-tickets')
      .set('Authorization', `Bearer ${attendeeAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((t: any) => t.id === ticketId)).toBe(true);
  });

  it('POST /api/v1/tickets/checkin/:qrHash - should REJECT check-in request from non-organizer (403)', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/checkin/${ticketQrHash}`)
      .set('Authorization', `Bearer ${attendeeAToken}`);

    expect(res.status).toBe(403);
  });

  it('POST /api/v1/tickets/checkin/:qrHash - should ALLOW first check-in by Organizer (HIGH-01 Atomic Gate Guard)', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/checkin/${ticketQrHash}`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(TicketStatus.CHECKED_IN);
    expect(res.body.data.checkedInAt).toBeDefined();
  });

  it('POST /api/v1/tickets/checkin/:qrHash - should REJECT second check-in attempt on already checked-in ticket (400)', async () => {
    // Attempt duplicate scan at gate
    const res = await request(app)
      .post(`/api/v1/tickets/checkin/${ticketQrHash}`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message.toLowerCase()).toContain('already been checked in');
  });
});
