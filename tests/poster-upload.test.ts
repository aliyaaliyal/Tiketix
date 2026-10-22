import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const app = createApp();

describe('Event Poster Upload & Serving Tests', () => {
  let organizerToken: string;
  let attendeeToken: string;
  let organizerId: string;
  let attendeeId: string;
  let uploadedFilePath: string | null = null;
  let createdEventId: string | null = null;

  beforeAll(async () => {
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_jwt_auth_testing_key_123';

    // 1. Create Organizer
    const organizer = await prisma.user.create({
      data: {
        email: `org_upload_${Date.now()}@test.com`,
        name: 'Poster Organizer',
        passwordHash: 'dummy_hash',
        role: UserRole.ORGANIZER,
      },
    });
    organizerId = organizer.id;
    organizerToken = jwt.sign({ id: organizer.id, email: organizer.email, role: organizer.role }, jwtSecret, { expiresIn: '1h' });

    // 2. Create Attendee
    const attendee = await prisma.user.create({
      data: {
        email: `att_upload_${Date.now()}@test.com`,
        name: 'Regular Attendee',
        passwordHash: 'dummy_hash',
        role: UserRole.ATTENDEE,
      },
    });
    attendeeId = attendee.id;
    attendeeToken = jwt.sign({ id: attendee.id, email: attendee.email, role: attendee.role }, jwtSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Clean up created event
    if (createdEventId) {
      await prisma.ticketTier.deleteMany({ where: { eventId: createdEventId } });
      await prisma.event.deleteMany({ where: { id: createdEventId } });
    }
    // Clean up users
    await prisma.user.deleteMany({
      where: { id: { in: [organizerId, attendeeId] } },
    });
    // Clean up uploaded test file
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch {
        // ignore
      }
    }
  });

  it('POST /api/v1/events/upload-poster - should REJECT unauthenticated upload with 401', async () => {
    const res = await request(app)
      .post('/api/v1/events/upload-poster')
      .attach('poster', Buffer.from('fake image content'), 'test.png');

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/events/upload-poster - should REJECT attendee upload with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/events/upload-poster')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .attach('poster', Buffer.from('fake image content'), 'test.png');

    expect(res.status).toBe(403);
  });

  it('POST /api/v1/events/upload-poster - should REJECT upload when no file is attached (400)', async () => {
    const res = await request(app)
      .post('/api/v1/events/upload-poster')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/events/upload-poster - should REJECT non-image file types (e.g. .txt) with 400', async () => {
    const res = await request(app)
      .post('/api/v1/events/upload-poster')
      .set('Authorization', `Bearer ${organizerToken}`)
      .attach('poster', Buffer.from('this is a text file'), {
        filename: 'malicious.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Format file tidak didukung');
  });

  it('POST /api/v1/events/upload-poster - should ACCEPT valid image and return file URL (200)', async () => {
    // 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );

    const res = await request(app)
      .post('/api/v1/events/upload-poster')
      .set('Authorization', `Bearer ${organizerToken}`)
      .attach('poster', pngBuffer, {
        filename: 'event-poster.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileUrl).toBeDefined();
    expect(res.body.data.fileUrl).toContain('/uploads/posters/poster-');
    expect(res.body.data.filename).toBeDefined();

    uploadedFilePath = path.join(process.cwd(), 'uploads', 'posters', res.body.data.filename);
    expect(fs.existsSync(uploadedFilePath)).toBe(true);

    // Also verify static serving
    const staticRes = await request(app).get(res.body.data.fileUrl);
    expect(staticRes.status).toBe(200);
    expect(staticRes.headers['content-type']).toContain('image/png');
  });

  it('POST /api/v1/events - should save posterUrl when creating a new event', async () => {
    const posterUrl = '/uploads/posters/poster-sample-test.png';
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'Festival with Uploaded Poster',
        slug: `poster-festival-${Date.now()}`,
        venueName: 'Jakarta International Expo',
        eventDate: new Date('2026-12-25T19:00:00Z').toISOString(),
        posterUrl,
        ticketTiers: [{ name: 'Festival Pass', price: 100000, totalQuota: 100 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.posterUrl).toBe(posterUrl);
    createdEventId = res.body.data.id;

    // Verify stored in DB
    const eventInDb = await prisma.event.findUnique({ where: { id: createdEventId! } });
    expect(eventInDb?.posterUrl).toBe(posterUrl);
  });
});
