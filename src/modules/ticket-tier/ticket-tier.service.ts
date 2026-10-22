import { TicketTierRepository } from './ticket-tier.repository';
import { CreateTicketTierInput } from './ticket-tier.validator';
import { prisma } from '../../config/database';
import { ForbiddenError, NotFoundError } from '../../common/errors';
import { AuthUser } from '../../types/express';
import { UserRole } from '@prisma/client';

export class TicketTierService {
  constructor(private readonly ticketTierRepository: TicketTierRepository) {}

  async createTicketTier(input: CreateTicketTierInput, currentUser?: AuthUser) {
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
    });
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (currentUser && currentUser.role !== UserRole.ADMIN && event.organizerId !== currentUser.id) {
      throw new ForbiddenError('You are not authorized to create ticket tiers for an event you do not own');
    }

    return this.ticketTierRepository.create({
      name: input.name,
      description: input.description,
      price: input.price,
      totalQuota: input.totalQuota,
      availableQuota: input.totalQuota, // Initially full quota
      startSaleDate: input.startSaleDate ? new Date(input.startSaleDate) : undefined,
      endSaleDate: input.endSaleDate ? new Date(input.endSaleDate) : undefined,
      event: {
        connect: { id: input.eventId },
      },
    });
  }

  async getTicketTiersByEvent(eventId: string) {
    return this.ticketTierRepository.findByEventId(eventId);
  }

  async getTicketTierById(id: string) {
    const tier = await this.ticketTierRepository.findById(id);
    if (!tier) {
      throw new NotFoundError('Ticket tier not found');
    }
    return tier;
  }
}
