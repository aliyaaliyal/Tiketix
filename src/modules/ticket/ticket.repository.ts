import { prisma } from '../../config/database';
import { Ticket, TicketStatus } from '@prisma/client';

export class TicketRepository {
  async findById(id: string): Promise<Ticket | null> {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        ticketTier: true,
        booking: {
          include: {
            event: true,
          },
        },
      },
    });
  }

  async findByQrHash(qrHash: string): Promise<Ticket | null> {
    return prisma.ticket.findUnique({
      where: { qrHash },
      include: {
        ticketTier: true,
        booking: {
          include: {
            event: true,
          },
        },
      },
    });
  }

  async findByTicketCode(ticketCode: string): Promise<Ticket | null> {
    return prisma.ticket.findUnique({
      where: { ticketCode },
      include: {
        ticketTier: true,
        booking: {
          include: {
            event: true,
          },
        },
      },
    });
  }

  async findByBookingId(bookingId: string): Promise<Ticket[]> {
    return prisma.ticket.findMany({
      where: { bookingId },
      include: {
        ticketTier: true,
        booking: {
          include: {
            event: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<Ticket[]> {
    return prisma.ticket.findMany({
      where: {
        booking: {
          userId,
        },
      },
      include: {
        ticketTier: true,
        booking: {
          include: {
            event: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: TicketStatus, checkedInAt?: Date): Promise<Ticket> {
    return prisma.ticket.update({
      where: { id },
      data: {
        status,
        checkedInAt,
      },
    });
  }

  async checkInTicketAtomic(qrHash: string, checkedInAt: Date): Promise<Ticket | null> {
    return prisma.$transaction(async (tx) => {
      // Atomically update ONLY IF ticket is currently ACTIVE
      const updateResult = await tx.ticket.updateMany({
        where: {
          qrHash,
          status: TicketStatus.ACTIVE,
        },
        data: {
          status: TicketStatus.CHECKED_IN,
          checkedInAt,
        },
      });

      if (updateResult.count === 0) {
        return null;
      }

      return tx.ticket.findUnique({
        where: { qrHash },
        include: {
          ticketTier: true,
          booking: {
            include: {
              event: true,
            },
          },
        },
      });
    });
  }
}
