import crypto from 'crypto';
import { BookingRepository } from './booking.repository';
import { BookingListQuery, CreateBookingInput } from './booking.validator';
import { prisma } from '../../config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors';
import { AuthUser } from '../../types/express';
import { BookingStatus, UserRole } from '@prisma/client';

export class BookingService {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async createBooking(input: CreateBookingInput) {
    if (!input.userId) {
      throw new BadRequestError('User ID is required to create a booking');
    }
    const userId = input.userId;

    // 1. Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 2. Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
    });
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // 3. Verify ticket tiers and calculate amounts
    let totalAmount = 0;
    const preparedItems: {
      ticketTierId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (const item of input.items) {
      const tier = await prisma.ticketTier.findUnique({
        where: { id: item.ticketTierId },
      });

      if (!tier || tier.eventId !== input.eventId) {
        throw new NotFoundError(`Ticket tier with ID '${item.ticketTierId}' not found for this event`);
      }

      if (tier.availableQuota < item.quantity) {
        throw new BadRequestError(
          `Insufficient quota for tier '${tier.name}'. Available: ${tier.availableQuota}, Requested: ${item.quantity}`
        );
      }

      const unitPrice = Number(tier.price);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      preparedItems.push({
        ticketTierId: tier.id,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      });
    }

    // 4. Generate unique booking code: TIK-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const bookingCode = `TIK-${dateStr}-${randomHex}`;

    // 5. Booking expiration: 30 minutes from now
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    return this.bookingRepository.createWithTransaction(
      {
        userId,
        eventId: input.eventId,
        bookingCode,
        totalAmount,
        expiresAt,
      },
      preparedItems
    );
  }

  // SEC-01: booking-by-code is no longer public. Only the booking owner,
  // the organizer of the event, or an ADMIN may read it (prevents code
  // enumeration leaking other buyers' PII). `findByCode` result includes
  // `event` + `user`, so organizer check uses `booking.event.organizerId`.
  async getBookingByCode(bookingCode: string, currentUser: AuthUser) {
    const booking = await this.bookingRepository.findByCode(bookingCode);
    if (!booking) {
      throw new NotFoundError(`Booking with code '${bookingCode}' not found`);
    }
    const bookingWithRelations = booking as typeof booking & {
      event: { organizerId: string } | null;
    };
    const isOwner = booking.userId === currentUser.id;
    const isOrganizer = bookingWithRelations.event?.organizerId === currentUser.id;
    const isAdmin = currentUser.role === UserRole.ADMIN;
    if (!isOwner && !isOrganizer && !isAdmin) {
      throw new ForbiddenError('You are not authorized to view this booking');
    }
    return booking;
  }

  // Same ownership rule as getBookingByCode: owner, event organizer, or ADMIN.
  async getBookingById(id: string, currentUser: AuthUser) {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }
    const bookingWithRelations = booking as typeof booking & {
      event: { organizerId: string } | null;
    };
    const isOwner = booking.userId === currentUser.id;
    const isOrganizer = bookingWithRelations.event?.organizerId === currentUser.id;
    const isAdmin = currentUser.role === UserRole.ADMIN;
    if (!isOwner && !isOrganizer && !isAdmin) {
      throw new ForbiddenError('You are not authorized to view this booking');
    }
    return booking;
  }

  // SEC-04: non-admin callers are pinned to their own id; pagination is
  // enforced at the repository layer (max 50 rows).
  async getUserBookings(currentUser: AuthUser, query: BookingListQuery) {
    const userId =
      currentUser.role === UserRole.ADMIN && query.userId ? query.userId : currentUser.id;
    return this.bookingRepository.findByUserId(userId, {
      page: query.page,
      limit: query.limit,
    });
  }

  async cancelBooking(id: string, currentUser: AuthUser) {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (currentUser.role !== UserRole.ADMIN && booking.userId !== currentUser.id) {
      throw new ForbiddenError('You are not authorized to cancel this booking');
    }

    if (booking.status === BookingStatus.PAID) {
      throw new BadRequestError(
        'Paid bookings cannot be directly cancelled. Please contact customer support for refund.'
      );
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestError('Booking is already cancelled.');
    }

    if (booking.status === BookingStatus.EXPIRED) {
      throw new BadRequestError('Booking has already expired.');
    }

    return this.bookingRepository.cancelWithTransaction(id);
  }

  async expireOverdueBookings(limit = 50) {
    const expiredCount = await this.bookingRepository.expireOverdueBookings(limit);
    return { expiredCount };
  }
}
