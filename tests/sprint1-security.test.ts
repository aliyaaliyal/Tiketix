import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { UserRole, BookingStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';

const app = createApp();

// Sprint 1 (SEC-01 … SEC-06) regression guards.
describe('Sprint 1 — Security Hotfix Guards', () => {
  let organizerToken: string;
  let ownerToken: string;
  let intruderToken: string;
  let adminToken: string;

  let organizerId: string;
  let ownerId: string;
  let intruderId: string;
  let adminId: string;

  let eventId: string;
  let tierId: string;
  let bookingId: string;
  let bookingCode: string;

  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_jwt_auth_testing_key_123';
  const sign = (id: string, email: string, role: UserRole) =>
    jwt.sign({ id, email, role }, jwtSecret, { expiresIn: '1h' });

  beforeAll(async () => {
    const suffix = Date.now();
    const organizer = await prisma.user.create({
      data: {
        email: `s1_org_${suffix}@test.com`,
        name: 'S1 Organizer',
        passwordHash: 'dummy_hash',
        role: UserRole.ORGANIZER,
      },
    });
    const owner = await prisma.user.create({
      data: {
        email: `s1_owner_${suffix}@test.com`,
        name: 'S1 Owner',
        passwordHash: 'dummy_hash',
        role: UserRole.ATTENDEE,
      },
    });
    const intruder = await prisma.user.create({
      data: {
        email: `s1_intruder_${suffix}@test.com`,
        name: 'S1 Intruder',
        passwordHash: 'dummy_hash',
        role: UserRole.ATTENDEE,
      },
    });
    const admin = await prisma.user.create({
      data: {
        email: `s1_admin_${suffix}@test.com`,
        name: 'S1 Admin',
        passwordHash: 'dummy_hash',
        role: UserRole.ADMIN,
      },
    });
    organizerId = organizer.id;
    ownerId = owner.id;
    intruderId = intruder.id;
    adminId = admin.id;
    organizerToken = sign(organizer.id, organizer.email, organizer.role);
    ownerToken = sign(owner.id, owner.email, owner.role);
    intruderToken = sign(intruder.id, intruder.email, intruder.role);
    adminToken = sign(admin.id, admin.email, admin.role);

    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: 'Sprint 1 Security Show',
        slug: `s1-security-show-${suffix}`,
        venueName: 'S1 Arena',
        eventDate: new Date('2026-11-15T20:00:00Z'),
      },
    });
    eventId = event.id;

    const tier = await prisma.ticketTier.create({
      data: {
        eventId: event.id,
        name: 'S1 Tier',
        price: 100000,
        totalQuota: 10,
        availableQuota: 10,
      },
    });
    tierId = tier.id;

    const booking = await prisma.booking.create({
      data: {
        userId: owner.id,
        eventId: event.id,
        bookingCode: `BK-S1-${suffix}`,
        totalAmount: 100000,
        status: BookingStatus.PENDING,
        expiresAt: new Date(Date.now() + 3600000),
        bookingItems: {
          create: {
            ticketTierId: tier.id,
            quantity: 1,
            unitPrice: 100000,
            subtotal: 100000,
          },
        },
      },
    });
    bookingId = booking.id;
    bookingCode = booking.bookingCode;
  });

  afterAll(async () => {
    if (bookingId) {
      await prisma.bookingItem.deleteMany({ where: { bookingId } });
      await prisma.booking.deleteMany({ where: { id: bookingId } });
    }
    if (tierId) await prisma.ticketTier.deleteMany({ where: { id: tierId } });
    if (eventId) await prisma.event.deleteMany({ where: { id: eventId } });
    await prisma.user.deleteMany({
      where: { id: { in: [organizerId, ownerId, intruderId, adminId] } },
    });
  });

  // ── SEC-01: booking-by-code requires auth + ownership ──────────────
  it('SEC-01: GET /bookings/code/:code tanpa token → 401', async () => {
    const res = await request(app).get(`/api/v1/bookings/code/${bookingCode}`);
    expect(res.status).toBe(401);
  });

  it('SEC-01: GET /bookings/code/:code milik orang lain → 403', async () => {
    const res = await request(app)
      .get(`/api/v1/bookings/code/${bookingCode}`)
      .set('Authorization', `Bearer ${intruderToken}`);
    expect(res.status).toBe(403);
  });

  it('SEC-01: pemilik booking bisa membaca → 200', async () => {
    const res = await request(app)
      .get(`/api/v1/bookings/code/${bookingCode}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.bookingCode).toBe(bookingCode);
  });

  it('SEC-01: organizer pemilik event bisa membaca → 200', async () => {
    const res = await request(app)
      .get(`/api/v1/bookings/code/${bookingCode}`)
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);
  });

  it('SEC-01: admin bisa membaca → 200', async () => {
    const res = await request(app)
      .get(`/api/v1/bookings/code/${bookingCode}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('SEC-01: GET /bookings/:id milik orang lain → 403', async () => {
    const res = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${intruderToken}`);
    expect(res.status).toBe(403);
  });

  // ── SEC-02: organizerId dari body diabaikan ───────────────────────
  it('SEC-02: organizerId di body tidak bisa membajak event orang lain', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        organizerId: intruderId, // malicious: should be ignored
        title: 'Hijack Attempt',
        slug: `hijack-${Date.now()}`,
        venueName: 'Nowhere',
        eventDate: new Date('2026-12-01T10:00:00Z').toISOString(),
      });
    expect(res.status).toBe(201);
    expect(res.body.data.organizerId).toBe(organizerId);
    await prisma.event.deleteMany({ where: { id: res.body.data.id } });
  });

  // ── SEC-04: getUserBookings pinned + paginated ────────────────────
  it('SEC-04: non-admin ?userId=milik-orang tetap dapat data sendiri', async () => {
    const res = await request(app)
      .get(`/api/v1/bookings?userId=${intruderId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    for (const b of res.body.data) {
      expect(b.userId).toBe(ownerId);
    }
  });

  it('SEC-04: limit dicap maksimal 50', async () => {
    const res = await request(app)
      .get('/api/v1/bookings?limit=9999')
      .set('Authorization', `Bearer ${ownerToken}`);
    // Zod max(50) → 400 validation error (capped, not silently served)
    expect(res.status).toBe(400);
  });

  it('SEC-04: pagination meta tersedia', async () => {
    const res = await request(app)
      .get('/api/v1/bookings?page=1&limit=5')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(5);
  });

  // ── SEC-06: upload guards ─────────────────────────────────────────
  it('SEC-06: file .txt rename .jpg ditolak 400 (double-extension/ext check)', async () => {
    const res = await request(app)
      .post('/api/v1/events/upload-poster')
      .set('Authorization', `Bearer ${organizerToken}`)
      .attach('poster', Buffer.from('not an image'), {
        filename: 'exploit.php.jpg',
        contentType: 'image/jpeg',
      });
    expect(res.status).toBe(400);
  });

  it('SEC-06: file >5MB ditolak 413 (bukan 500)', async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 0);
    const res = await request(app)
      .post('/api/v1/events/upload-poster')
      .set('Authorization', `Bearer ${organizerToken}`)
      .attach('poster', big, {
        filename: 'huge.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(413);
  });
});
