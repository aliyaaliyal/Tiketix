import { Request, Response, NextFunction } from 'express';
import { TicketTierService } from './ticket-tier.service';
import { sendCreated, sendSuccess } from '../../common/response';

export class TicketTierController {
  constructor(private readonly ticketTierService: TicketTierService) {}

  createTicketTier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tier = await this.ticketTierService.createTicketTier(req.body, req.user);
      return sendCreated(res, tier, 'Ticket tier created successfully');
    } catch (error) {
      return next(error);
    }
  };

  getTicketTiers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = req.query.eventId as string;
      if (eventId) {
        const tiers = await this.ticketTierService.getTicketTiersByEvent(eventId);
        return sendSuccess(res, tiers);
      }
      return sendSuccess(res, []);
    } catch (error) {
      return next(error);
    }
  };

  getTicketTierById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const tier = await this.ticketTierService.getTicketTierById(id);
      return sendSuccess(res, tier);
    } catch (error) {
      return next(error);
    }
  };
}
