import { EventRepository } from './event.repository';
import { CreateEventInput } from './event.validator';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors';
import { EventStatus } from '@prisma/client';

export class EventService {
  constructor(private readonly eventRepository: EventRepository) {}

  async createEvent(input: CreateEventInput) {
    if (!input.organizerId) {
      throw new BadRequestError('Organizer ID is required to create an event');
    }
    const organizerId = input.organizerId;

    const existing = await this.eventRepository.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError(`Event with slug '${input.slug}' already exists`);
    }

    const ticketTiersCreate =
      input.ticketTiers && input.ticketTiers.length > 0
        ? {
            create: input.ticketTiers.map((t) => ({
              name: t.name,
              description: t.description,
              price: t.price,
              totalQuota: t.totalQuota,
              availableQuota: t.totalQuota,
            })),
          }
        : undefined;

    return this.eventRepository.create({
      title: input.title,
      slug: input.slug,
      description: input.description,
      venueName: input.venueName,
      venueAddress: input.venueAddress,
      posterUrl: input.posterUrl,
      bannerUrl: input.bannerUrl,
      eventDate: new Date(input.eventDate),
      endTime: input.endTime ? new Date(input.endTime) : undefined,
      status: input.status as EventStatus,
      organizer: {
        connect: { id: organizerId },
      },
      ticketTiers: ticketTiersCreate,
    });
  }

  async getEventBySlug(slug: string) {
    const event = await this.eventRepository.findBySlug(slug);
    if (!event) {
      throw new NotFoundError(`Event with slug '${slug}' not found`);
    }
    return event;
  }

  async getEventById(id: string) {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundError('Event not found');
    }
    return event;
  }

  async getAllEvents(status?: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED') {
    return this.eventRepository.findAll(status);
  }

  async getOrganizerDashboard(userId: string, role: string) {
    const organizerId = role === 'ADMIN' ? undefined : userId;
    return this.eventRepository.getOrganizerDashboardData(organizerId);
  }

  async getOrganizerAttendees(userId: string, role: string, eventId?: string, search?: string) {
    const organizerId = role === 'ADMIN' ? undefined : userId;
    return this.eventRepository.getOrganizerAttendees(organizerId, eventId, search);
  }
}

