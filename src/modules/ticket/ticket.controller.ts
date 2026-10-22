import { Request, Response, NextFunction } from 'express';
import { TicketService } from './ticket.service';
import { sendSuccess } from '../../common/response';

export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  getTicketByQrHash = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const qrHash = req.params.qrHash as string;
      const ticket = await this.ticketService.getTicketByQrHash(qrHash);
      return sendSuccess(res, ticket);
    } catch (error) {
      return next(error);
    }
  };

  getTicketById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const ticket = await this.ticketService.getTicketById(id, req.user);
      return sendSuccess(res, ticket);
    } catch (error) {
      return next(error);
    }
  };

  getTicketsByBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookingId = req.query.bookingId as string;
      if (bookingId) {
        const tickets = await this.ticketService.getTicketsByBooking(bookingId, req.user);
        return sendSuccess(res, tickets);
      }
      return sendSuccess(res, []);
    } catch (error) {
      return next(error);
    }
  };

  getMyTickets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tickets = await this.ticketService.getUserTickets(req.user!.id);
      return sendSuccess(res, tickets);
    } catch (error) {
      return next(error);
    }
  };

  checkIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const qrHash = req.params.qrHash as string;
      const ticket = await this.ticketService.checkInTicket(qrHash);
      return sendSuccess(res, ticket, 'Ticket successfully checked in');
    } catch (error) {
      return next(error);
    }
  };
}
