import { PrismaClient, UserRole, EventStatus, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Demo reset — 1 perintah untuk menyiapkan panggung demo ke klien:
 *
 *   npm run demo:reset
 *
 * Isi panggung (idempotent via upsert):
 *  - attendee@tiketix.com / Password123!  (penonton)
 *  - organizer@tiketix.com / Password123! (EO pemilik konser demo)
 *  - 1 konser PUBLISHED "Soundwave Music Festival 2026" + 2 tier
 *  - 1 booking PENDING milik attendee (siap dibayar di /checkout)
 *  - 1 booking PAID + 1 tiket ACTIVE milik attendee (siap di-scan di /scanner)
 *
 * Jalankan backend + `npx prisma migrate deploy` dulu bila DB masih kosong.
 */
async function main() {
  console.log('🎬 Menyiapkan panggung demo Tiketix...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@tiketix.com' },
    update: { passwordHash, name: 'Soundwave Promoter Indonesia', role: UserRole.ORGANIZER },
    create: {
      email: 'organizer@tiketix.com',
      name: 'Soundwave Promoter Indonesia',
      passwordHash,
      role: UserRole.ORGANIZER,
      phoneNumber: '+628111222333',
    },
  });

  const attendee = await prisma.user.upsert({
    where: { email: 'attendee@tiketix.com' },
    update: { passwordHash, name: 'Budi Santoso', role: UserRole.ATTENDEE },
    create: {
      email: 'attendee@tiketix.com',
      name: 'Budi Santoso',
      passwordHash,
      role: UserRole.ATTENDEE,
      phoneNumber: '+6281234567890',
    },
  });
  console.log(`✅ Akun demo: ${organizer.email} (ORGANIZER), ${attendee.email} (ATTENDEE)`);

  const event = await prisma.event.upsert({
    where: { slug: 'soundwave-music-festival-2026' },
    update: { status: EventStatus.PUBLISHED },
    create: {
      organizerId: organizer.id,
      title: 'Soundwave Music Festival 2026',
      slug: 'soundwave-music-festival-2026',
      description: 'Festival musik tahunan — panggung demo untuk presentasi ke klien.',
      venueName: 'Stadion Madya Gelora Bung Karno',
      venueAddress: 'Jl. Gerbang Pemuda No.3, Gelora, Jakarta Pusat',
      posterUrl:
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
      bannerUrl:
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80',
      eventDate: new Date('2026-11-28T15:00:00+07:00'),
      endTime: new Date('2026-11-28T23:30:00+07:00'),
      status: EventStatus.PUBLISHED,
    },
  });

  const tierEarly = await prisma.ticketTier.upsert({
    where: { id: 'd0000000-0000-0000-0000-000000000001' },
    update: { availableQuota: 50 },
    create: {
      id: 'd0000000-0000-0000-0000-000000000001',
      eventId: event.id,
      name: 'Early Bird Festival',
      description: 'Akses area festival umum.',
      price: 150000,
      totalQuota: 50,
      availableQuota: 50,
    },
  });
  const tierVip = await prisma.ticketTier.upsert({
    where: { id: 'd0000000-0000-0000-0000-000000000002' },
    update: { availableQuota: 20 },
    create: {
      id: 'd0000000-0000-0000-0000-000000000002',
      eventId: event.id,
      name: 'VIP Front Row Pass',
      description: 'Front-row + fast-track Gate A.',
      price: 350000,
      totalQuota: 20,
      availableQuota: 20,
    },
  });
  console.log(`✅ Event demo: ${event.title} (${event.slug})`);

  // Bersihkan sisa demo kemarin agar kuota konsisten, lalu buat ulang.
  const oldBookings = await prisma.booking.findMany({
    where: { userId: attendee.id, eventId: event.id, bookingCode: { startsWith: 'TIK-DEMO-' } },
    select: { id: true },
  });
  for (const b of oldBookings) {
    await prisma.ticket.deleteMany({ where: { bookingId: b.id } });
    await prisma.bookingItem.deleteMany({ where: { bookingId: b.id } });
    await prisma.paymentTransaction.deleteMany({ where: { bookingId: b.id } });
    await prisma.booking.delete({ where: { id: b.id } });
  }

  // 1. Booking PENDING — bahan adegan "bayar" di checkout.
  const pending = await prisma.booking.create({
    data: {
      userId: attendee.id,
      eventId: event.id,
      bookingCode: `TIK-DEMO-PAY-${Date.now().toString().slice(-6)}`,
      totalAmount: 300000,
      status: BookingStatus.PENDING,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      bookingItems: {
        create: [{ ticketTierId: tierEarly.id, quantity: 2, unitPrice: 150000, subtotal: 300000 }],
      },
    },
  });
  await prisma.ticketTier.update({
    where: { id: tierEarly.id },
    data: { availableQuota: { decrement: 2 } },
  });

  // 2. Booking PAID + tiket ACTIVE — bahan adegan "scan" di gate.
  const paid = await prisma.booking.create({
    data: {
      userId: attendee.id,
      eventId: event.id,
      bookingCode: `TIK-DEMO-SCAN-${Date.now().toString().slice(-6)}`,
      totalAmount: 350000,
      status: BookingStatus.PAID,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      bookingItems: {
        create: [{ ticketTierId: tierVip.id, quantity: 1, unitPrice: 350000, subtotal: 350000 }],
      },
    },
    include: { bookingItems: true },
  });
  await prisma.paymentTransaction.create({
    data: {
      bookingId: paid.id,
      transactionCode: `PAY-DEMO-${Date.now().toString().slice(-6)}`,
      paymentGateway: 'SIMULATOR',
      amount: 350000,
      status: 'SETTLEMENT',
      paidAt: new Date(),
      payload: { paymentMethod: 'QRIS', isSimulated: true, note: 'demo:reset seed' },
    },
  });
  const item = paid.bookingItems[0];
  const qrHash = `demo-qr-${Date.now().toString(36)}`;
  await prisma.ticket.create({
    data: {
      bookingId: paid.id,
      bookingItemId: item.id,
      ticketTierId: tierVip.id,
      ticketCode: `TKT-DEMO-${Date.now().toString().slice(-6)}`,
      qrHash,
      attendeeName: attendee.name,
      attendeeEmail: attendee.email,
      status: 'ACTIVE',
    },
  });
  await prisma.ticketTier.update({
    where: { id: tierVip.id },
    data: { availableQuota: { decrement: 1 } },
  });

  console.log('✅ Booking PENDING (adegan bayar):', pending.bookingCode);
  console.log('✅ Booking PAID + tiket ACTIVE (adegan scan), qrHash:', qrHash);
  console.log('');
  console.log('🎬 Panggung demo siap! Skrip: baca PANDUAN_DEMO.md');
}

main()
  .catch((e) => {
    console.error('❌ Gagal menyiapkan demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
