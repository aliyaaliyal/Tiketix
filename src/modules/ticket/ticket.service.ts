import { TicketRepository } from './ticket.repository';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors';
import { TicketStatus, UserRole } from '@prisma/client';
import { AuthUser } from '../../types/express';

export class TicketService {
  constructor(private readonly ticketRepository: TicketRepository) {}

  async getTicketByQrHash(qrHash: string) {
    const ticket = await this.ticketRepository.findByQrHash(qrHash);
    if (!ticket) {
      throw new NotFoundError('Invalid ticket or QR code not found');
    }
    return ticket;
  }

  async getTicketById(id: string, currentUser?: AuthUser) {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (currentUser && currentUser.role !== UserRole.ADMIN) {
      const isOwner = (ticket as any).booking?.userId === currentUser.id;
      const isOrganizer = (ticket as any).booking?.event?.organizerId === currentUser.id;
      if (!isOwner && !isOrganizer) {
        throw new ForbiddenError('You are not authorized to view this ticket');
      }
    }

    return ticket;
  }

  async getTicketsByBooking(bookingId: string, currentUser?: AuthUser) {
    const tickets = await this.ticketRepository.findByBookingId(bookingId);
    if (tickets.length === 0) {
      return [];
    }

    if (currentUser && currentUser.role !== UserRole.ADMIN) {
      const firstTicket = tickets[0] as any;
      const isOwner = firstTicket.booking?.userId === currentUser.id;
      const isOrganizer = firstTicket.booking?.event?.organizerId === currentUser.id;
      if (!isOwner && !isOrganizer) {
        throw new ForbiddenError('You are not authorized to view tickets for this booking');
      }
    }

    return tickets;
  }

  async getUserTickets(userId: string) {
    return this.ticketRepository.findByUserId(userId);
  }

  async checkInTicket(qrHash: string) {
    const checkedInTicket = await this.ticketRepository.checkInTicketAtomic(qrHash, new Date());
    if (checkedInTicket) {
      return checkedInTicket;
    }

    // Atomic update failed (status was not ACTIVE or not found), query details for exact message
    const ticket = await this.ticketRepository.findByQrHash(qrHash);
    if (!ticket) {
      throw new NotFoundError('Ticket or QR code not found');
    }

    if (ticket.status === TicketStatus.CHECKED_IN) {
      throw new BadRequestError(
        `Ticket has already been checked in at ${ticket.checkedInAt?.toISOString()}`
      );
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestError('Ticket has been cancelled and cannot be used');
    }

    throw new BadRequestError('Ticket is not in an active state for check-in');
  }
}
