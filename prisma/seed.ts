import { PrismaClient, UserRole, EventStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash a default password for test accounts
  const defaultPassword = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  // 1. Seed Organizer User
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@tiketix.com' },
    update: {},
    create: {
      email: 'organizer@tiketix.com',
      name: 'Soundwave Promoter Indonesia',
      passwordHash,
      role: UserRole.ORGANIZER,
      phoneNumber: '+6281234567890',
    },
  });
  console.log(`✅ Organizer created: ${organizer.name} (${organizer.email})`);

  // 2. Seed Attendee User
  const attendee = await prisma.user.upsert({
    where: { email: 'attendee@tiketix.com' },
    update: {},
    create: {
      email: 'attendee@tiketix.com',
      name: 'Budi Santoso',
      passwordHash,
      role: UserRole.ATTENDEE,
      phoneNumber: '+6289876543210',
    },
  });
  console.log(`✅ Attendee created: ${attendee.name} (${attendee.email})`);

  // 3. Seed Music Concert Event
  const concertEvent = await prisma.event.upsert({
    where: { slug: 'soundwave-music-festival-2026' },
    update: {
      posterUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80',
    },
    create: {
      organizerId: organizer.id,
      title: 'Soundwave Music Festival 2026',
      slug: 'soundwave-music-festival-2026',
      description:
        'Festival musik tahunan terbesar yang menampilkan artis papan atas nasional & internasional dalam 3 panggung megah.',
      venueName: 'Stadion Madya Gelora Bung Karno',
      venueAddress: 'Jl. Gerbang Pemuda No.3, Gelora, Tanah Abang, Jakarta Pusat',
      posterUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80',
      eventDate: new Date('2026-11-28T15:00:00+07:00'),
      endTime: new Date('2026-11-28T23:30:00+07:00'),
      status: EventStatus.PUBLISHED,
    },
  });
  console.log(`✅ Concert Event created: ${concertEvent.title} (slug: ${concertEvent.slug})`);

  // 4. Seed Ticket Tiers for the Event
  // Tier 1: Early Bird (Quota: 50, Price: 150000)
  const existingEarlyBird = await prisma.ticketTier.findFirst({
    where: { eventId: concertEvent.id, name: 'Early Bird' },
  });

  if (!existingEarlyBird) {
    const earlyBird = await prisma.ticketTier.create({
      data: {
        eventId: concertEvent.id,
        name: 'Early Bird',
        description: 'Tiket presale terbatas dengan akses area festival umum.',
        price: 150000,
        totalQuota: 50,
        availableQuota: 50,
        startSaleDate: new Date('2026-10-01T09:00:00+07:00'),
        endSaleDate: new Date('2026-11-01T23:59:59+07:00'),
      },
    });
    console.log(
      `✅ Ticket Tier created: ${earlyBird.name} - Quota: ${earlyBird.totalQuota} - Price: Rp${earlyBird.price}`
    );
  } else {
    console.log(`ℹ️ Ticket Tier 'Early Bird' already exists.`);
  }

  // Tier 2: VIP (Quota: 20, Price: 350000)
  const existingVip = await prisma.ticketTier.findFirst({
    where: { eventId: concertEvent.id, name: 'VIP' },
  });

  if (!existingVip) {
    const vip = await prisma.ticketTier.create({
      data: {
        eventId: concertEvent.id,
        name: 'VIP',
        description:
          'Akses barisan depan (front-row), jalur antrean khusus (fast-track), free flow minuman, dan merchandise eksklusif.',
        price: 350000,
        totalQuota: 20,
        availableQuota: 20,
        startSaleDate: new Date('2026-10-01T09:00:00+07:00'),
        endSaleDate: new Date('2026-11-25T23:59:59+07:00'),
      },
    });
    console.log(`✅ Ticket Tier created: ${vip.name} - Quota: ${vip.totalQuota} - Price: Rp${vip.price}`);
  } else {
    console.log(`ℹ️ Ticket Tier 'VIP' already exists.`);
  }

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error while seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
