import { prisma } from '../../config/database';
import { Event, Prisma } from '@prisma/client';

export class EventRepository {
  async findById(id: string): Promise<Event | null> {
    return prisma.event.findUnique({
      where: { id },
      include: {
        ticketTiers: true,
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string): Promise<Event | null> {
    return prisma.event.findUnique({
      where: { slug },
      include: {
        ticketTiers: true,
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(status?: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED'): Promise<Event[]> {
    return prisma.event.findMany({
      where: status ? { status } : undefined,
      include: {
        ticketTiers: true,
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { eventDate: 'asc' },
    });
  }

  async create(data: Prisma.EventCreateInput): Promise<Event> {
    return prisma.event.create({
      data,
      include: {
        ticketTiers: true,
      },
    });
  }

  async getOrganizerDashboardData(organizerId?: string) {
    const eventFilter = organizerId ? { organizerId } : {};

    // 1. Get all events with tiers and paid bookings
    const events = await prisma.event.findMany({
      where: eventFilter,
      include: {
        ticketTiers: true,
        bookings: {
          where: { status: 'PAID' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const eventIds = events.map((e) => e.id);

    // 2. Recent paid bookings
    const paidBookings = await prisma.booking.findMany({
      where: {
        eventId: { in: eventIds },
        status: 'PAID',
      },
      select: {
        id: true,
        bookingCode: true,
        totalAmount: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        event: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const totalRevenue = events.reduce((sum, ev) => {
      return (
        sum +
        ev.bookings.reduce((bSum, b) => bSum + Number(b.totalAmount), 0)
      );
    }, 0);

    // 3. Ticket Quotas and Counts
    let totalQuota = 0;
    let totalAvailable = 0;
    events.forEach((ev) => {
      ev.ticketTiers.forEach((tier) => {
        totalQuota += tier.totalQuota;
        totalAvailable += tier.availableQuota;
      });
    });
    const totalTicketsSold = totalQuota - totalAvailable;

    // 4. Checked-in tickets count
    const checkedInCount = await prisma.ticket.count({
      where: {
        booking: {
          eventId: { in: eventIds },
        },
        status: 'CHECKED_IN',
      },
    });

    const issuedTicketsCount = await prisma.ticket.count({
      where: {
        booking: {
          eventId: { in: eventIds },
        },
      },
    });

    const checkInRate =
      issuedTicketsCount > 0
        ? Math.round((checkedInCount / issuedTicketsCount) * 100)
        : 0;

    return {
      stats: {
        totalEvents: events.length,
        totalRevenue,
        totalTicketsSold,
        totalQuota,
        totalAvailable,
        checkedInCount,
        issuedTicketsCount,
        checkInRate,
      },
      events: events.map((ev) => ({
        id: ev.id,
        title: ev.title,
        slug: ev.slug,
        venueName: ev.venueName,
        eventDate: ev.eventDate,
        status: ev.status,
        ticketTiers: ev.ticketTiers,
        totalQuota: ev.ticketTiers.reduce((acc, t) => acc + t.totalQuota, 0),
        soldQuota: ev.ticketTiers.reduce((acc, t) => acc + (t.totalQuota - t.availableQuota), 0),
        revenue: ev.bookings.reduce((acc, b) => acc + Number(b.totalAmount), 0),
      })),
      recentBookings: paidBookings.map((b) => ({
        id: b.id,
        bookingCode: b.bookingCode,
        totalAmount: Number(b.totalAmount),
        createdAt: b.createdAt,
        attendeeName: b.user.name,
        attendeeEmail: b.user.email,
        eventTitle: b.event.title,
      })),
    };
  }

  async getOrganizerAttendees(organizerId?: string, eventId?: string, search?: string) {
    const whereClause: Prisma.TicketWhereInput = {
      booking: {
        event: organizerId ? { organizerId } : undefined,
        eventId: eventId || undefined,
      },
    };

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { attendeeName: { contains: q, mode: 'insensitive' } },
        { attendeeEmail: { contains: q, mode: 'insensitive' } },
        { ticketCode: { contains: q, mode: 'insensitive' } },
        { booking: { bookingCode: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        ticketTier: { select: { name: true, price: true } },
        booking: {
          select: {
            bookingCode: true,
            createdAt: true,
            event: { select: { title: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticketCode: t.ticketCode,
      qrHash: t.qrHash,
      attendeeName: t.attendeeName,
      attendeeEmail: t.attendeeEmail,
      tierName: t.ticketTier.name,
      price: Number(t.ticketTier.price),
      status: t.status,
      checkedInAt: t.checkedInAt,
      bookingCode: t.booking.bookingCode,
      eventTitle: t.booking.event.title,
      purchasedAt: t.createdAt,
    }));
  }
}

