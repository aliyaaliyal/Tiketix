import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { UserRole, BookingStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';

const app = createApp();

describe('Booking & Payment Concurrency Hardening Tests', () => {
  let organizerToken: string;
  let user1Token: string;
  let user2Token: string;

  let organizerId: string;
  let user1Id: string;
  let user2Id: string;

  let eventId: string;
  let limitedTierId: string;
  let cancelTierId: string;

  let bookingCode1: string;
  let bookingId1: string;

  let cancelBookingId: string;

  beforeAll(async () => {
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_jwt_auth_testing_key_123';

    // 1. Create Organizer
    const organizer = await prisma.user.create({
      data: {
        email: `org_book_${Date.now()}@test.com`,
        name: 'Concert Organizer',
        passwordHash: 'dummy_hash',
        role: UserRole.ORGANIZER,
      },
    });
    organizerId = organizer.id;
    organizerToken = jwt.sign({ id: organizer.id, email: organizer.email, role: organizer.role }, jwtSecret, { expiresIn: '1h' });

    // 2. Create User 1
    const user1 = await prisma.user.create({
      data: {
        email: `buyer1_${Date.now()}@test.com`,
        name: 'First Buyer',
        passwordHash: 'dummy_hash',
        role: UserRole.ATTENDEE,
      },
    });
    user1Id = user1.id;
    user1Token = jwt.sign({ id: user1.id, email: user1.email, role: user1.role }, jwtSecret, { expiresIn: '1h' });

    // 3. Create User 2
    const user2 = await prisma.user.create({
      data: {
        email: `buyer2_${Date.now()}@test.com`,
        name: 'Second Buyer',
        passwordHash: 'dummy_hash',
        role: UserRole.ATTENDEE,
      },
    });
    user2Id = user2.id;
    user2Token = jwt.sign({ id: user2.id, email: user2.email, role: user2.role }, jwtSecret, { expiresIn: '1h' });

    // 4. Create Event
    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: 'Quota Concurrency Test Show',
        slug: `quota-show-${Date.now()}`,
        venueName: 'Jakarta Expo Arena',
        venueAddress: 'Kemayoran Jakarta',
        eventDate: new Date('2026-11-15T20:00:00Z'),
      },
    });
    eventId = event.id;

    // 5. Tier with strictly limited quota = 2
    const limitedTier = await prisma.ticketTier.create({
      data: {
        eventId: event.id,
        name: 'Limited Flash Tier',
        price: 250000,
        totalQuota: 2,
        availableQuota: 2,
      },
    });
    limitedTierId = limitedTier.id;

    // 6. Tier for cancellation test = 1
    const cancelTier = await prisma.ticketTier.create({
      data: {
        eventId: event.id,
        name: 'Cancellation Tier',
        price: 150000,
        totalQuota: 1,
        availableQuota: 1,
      },
    });
    cancelTierId = cancelTier.id;
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    if (bookingId1) {
      await prisma.ticket.deleteMany({ where: { bookingId: bookingId1 } });
      await prisma.paymentTransaction.deleteMany({ where: { bookingId: bookingId1 } });
      await prisma.bookingItem.deleteMany({ where: { bookingId: bookingId1 } });
      await prisma.booking.deleteMany({ where: { id: bookingId1 } });
    }
    if (cancelBookingId) {
      await prisma.bookingItem.deleteMany({ where: { bookingId: cancelBookingId } });
      await prisma.booking.deleteMany({ where: { id: cancelBookingId } });
    }
    if (limitedTierId || cancelTierId) {
      await prisma.ticketTier.deleteMany({ where: { eventId } });
    }
    if (eventId) {
      await prisma.event.deleteMany({ where: { id: eventId } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [organizerId, user1Id, user2Id] } },
    });
  });

  it('POST /api/v1/bookings - User 1 successfully reserves the entire available quota (2 tickets)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        eventId,
        items: [{ ticketTierId: limitedTierId, quantity: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingCode).toBeDefined();
    expect(res.body.data.status).toBe(BookingStatus.PENDING);

    bookingCode1 = res.body.data.bookingCode;
    bookingId1 = res.body.data.id;

    // Verify remaining quota in DB is now 0
    const updatedTier = await prisma.ticketTier.findUnique({ where: { id: limitedTierId } });
    expect(updatedTier?.availableQuota).toBe(0);
  });

  it('POST /api/v1/bookings - User 2 attempt to book sold-out tier is REJECTED with 400 (HIGH-03 Quota Guard)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        eventId,
        items: [{ ticketTierId: limitedTierId, quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message.toLowerCase()).toContain('insufficient quota');
  });

  it('POST /api/v1/payments/pay - Settle payment issues official tickets with QR codes', async () => {
    const res = await request(app)
      .post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        bookingCode: bookingCode1,
        attendees: [
          { ticketTierId: limitedTierId, name: 'Attendee 1', email: 'att1@test.com' },
          { ticketTierId: limitedTierId, name: 'Attendee 2', email: 'att2@test.com' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify tickets created in DB
    const issuedTickets = await prisma.ticket.findMany({ where: { bookingId: bookingId1 } });
    expect(issuedTickets.length).toBe(2);
    expect(issuedTickets[0].qrHash).toBeDefined();
    expect(issuedTickets[1].qrHash).toBeDefined();
    expect(issuedTickets[0].qrHash).not.toBe(issuedTickets[1].qrHash); // Unique QR hashes
  });

  it('POST /api/v1/payments/pay - Duplicate payment call is IDEMPOTENT: same receipt, no extra tickets (HIGH-02)', async () => {
    // Attempt duplicate settlement (e.g. concurrent webhook or user double-click).
    // New behavior: idempotent 200 with the SAME receipt (anti double-charge),
    // instead of the old 400. Ticket count must stay at 2 either way.
    const res = await request(app)
      .post('/api/v1/payments/pay')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        bookingCode: bookingCode1,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.alreadySettled).toBe(true);
    expect(res.body.data.ticketsCount).toBe(2);

    // Verify ticket count did NOT increase
    const currentTickets = await prisma.ticket.findMany({ where: { bookingId: bookingId1 } });
    expect(currentTickets.length).toBe(2);
  });

  it('POST /api/v1/bookings/:id/cancel - Cancelling pending booking restores tier quota atomik', async () => {
    // 1. Create temporary booking on cancelTier
    const bookRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        eventId,
        items: [{ ticketTierId: cancelTierId, quantity: 1 }],
      });

    expect(bookRes.status).toBe(201);
    cancelBookingId = bookRes.body.data.id;

    // Check quota reduced to 0
    let tierCheck = await prisma.ticketTier.findUnique({ where: { id: cancelTierId } });
    expect(tierCheck?.availableQuota).toBe(0);

    // 2. Cancel booking
    const cancelRes = await request(app)
      .post(`/api/v1/bookings/${cancelBookingId}/cancel`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.status).toBe(BookingStatus.CANCELLED);

    // Check quota restored to 1
    tierCheck = await prisma.ticketTier.findUnique({ where: { id: cancelTierId } });
    expect(tierCheck?.availableQuota).toBe(1);

    // 3. Double cancellation attempt should be rejected
    const doubleCancelRes = await request(app)
      .post(`/api/v1/bookings/${cancelBookingId}/cancel`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(doubleCancelRes.status).toBe(400);
    expect(doubleCancelRes.body.success).toBe(false);
  });
});
