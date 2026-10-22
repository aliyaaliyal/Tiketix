import { prisma } from '../../config/database';
import { Booking, BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../common/errors';

export class BookingRepository {
  async findById(id: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        bookingItems: {
          include: {
            ticketTier: true,
          },
        },
        event: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        tickets: true,
        paymentTransactions: true,
      },
    });
  }

  async findByCode(bookingCode: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        bookingItems: {
          include: {
            ticketTier: true,
          },
        },
        event: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        tickets: true,
        paymentTransactions: true,
      },
    });
  }

  async findByUserId(
    userId: string,
    pagination: { page: number; limit: number } = { page: 1, limit: 10 }
  ): Promise<{ data: Booking[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = Math.max(1, pagination.page);
    const limit = Math.min(Math.max(1, pagination.limit), 50);
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      prisma.booking.count({ where: { userId } }),
      prisma.booking.findMany({
        where: { userId },
        include: {
          bookingItems: {
            include: {
              ticketTier: true,
            },
          },
          event: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async createWithTransaction(
    bookingData: {
      userId: string;
      eventId: string;
      bookingCode: string;
      totalAmount: number;
      expiresAt: Date;
    },
    items: {
      ticketTierId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[]
  ): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
      // 1. Decrement quota for each tier and ensure available_quota >= 0
      for (const item of items) {
        // Direct update with decrement triggers CHECK (available_quota >= 0) constraint if insufficient
        await tx.ticketTier.update({
          where: { id: item.ticketTierId },
          data: {
            availableQuota: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 2. Create the booking and items
      const booking = await tx.booking.create({
        data: {
          userId: bookingData.userId,
          eventId: bookingData.eventId,
          bookingCode: bookingData.bookingCode,
          totalAmount: bookingData.totalAmount,
          expiresAt: bookingData.expiresAt,
          bookingItems: {
            create: items.map((item) => ({
              ticketTierId: item.ticketTierId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          bookingItems: {
            include: {
              ticketTier: true,
            },
          },
        },
      });

      return booking;
    });
  }

  async cancelWithTransaction(bookingId: string): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch booking with items
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { bookingItems: true },
      });

      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // 2. Atomically check and mark booking as CANCELLED ONLY IF currently PENDING
      const updateResult = await tx.booking.updateMany({
        where: {
          id: bookingId,
          status: BookingStatus.PENDING,
        },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestError(`Cannot cancel booking with current status '${booking.status}'`);
      }

      // 3. Rollback quota for each tier
      for (const item of booking.bookingItems) {
        await tx.ticketTier.update({
          where: { id: item.ticketTierId },
          data: {
            availableQuota: {
              increment: item.quantity,
            },
          },
        });
      }

      // 4. Update pending payments to FAILED
      await tx.paymentTransaction.updateMany({
        where: {
          bookingId,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      const updated = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          bookingItems: {
            include: {
              ticketTier: true,
            },
          },
        },
      });

      return updated!;
    });
  }

  async expireOverdueBookings(limit = 50): Promise<number> {
    const overdueBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        expiresAt: {
          lte: new Date(),
        },
      },
      include: {
        bookingItems: true,
      },
      take: limit,
    });

    if (overdueBookings.length === 0) {
      return 0;
    }

    let expiredCount = 0;

    for (const booking of overdueBookings) {
      try {
        await prisma.$transaction(async (tx) => {
          // Atomically update status to EXPIRED ONLY IF still PENDING
          const updateResult = await tx.booking.updateMany({
            where: {
              id: booking.id,
              status: BookingStatus.PENDING,
            },
            data: {
              status: BookingStatus.EXPIRED,
            },
          });

          // If another transaction already settled or cancelled the booking, skip rollback!
          if (updateResult.count === 0) {
            return;
          }

          // Rollback quota
          for (const item of booking.bookingItems) {
            await tx.ticketTier.update({
              where: { id: item.ticketTierId },
              data: {
                availableQuota: {
                  increment: item.quantity,
                },
              },
            });
          }

          // Mark pending payments as EXPIRED
          await tx.paymentTransaction.updateMany({
            where: {
              bookingId: booking.id,
              status: PaymentStatus.PENDING,
            },
            data: {
              status: PaymentStatus.EXPIRED,
            },
          });
        });

        expiredCount++;
      } catch (err) {
        console.error(`Failed to expire booking ${booking.bookingCode}:`, err);
      }
    }

    return expiredCount;
  }
}
