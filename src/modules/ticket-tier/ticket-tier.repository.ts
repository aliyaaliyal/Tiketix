import { prisma } from '../../config/database';
import { TicketTier, Prisma } from '@prisma/client';

export class TicketTierRepository {
  async findById(id: string): Promise<TicketTier | null> {
    return prisma.ticketTier.findUnique({
      where: { id },
    });
  }

  async findByEventId(eventId: string): Promise<TicketTier[]> {
    return prisma.ticketTier.findMany({
      where: { eventId },
      orderBy: { price: 'asc' },
    });
  }

  async create(data: Prisma.TicketTierCreateInput): Promise<TicketTier> {
    return prisma.ticketTier.create({
      data,
    });
  }

  async decrementQuota(id: string, count: number, tx?: Prisma.TransactionClient): Promise<TicketTier> {
    const client = tx || prisma;
    return client.ticketTier.update({
      where: { id },
      data: {
        availableQuota: {
          decrement: count,
        },
      },
    });
  }
}
