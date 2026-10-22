import { Router } from 'express';
import { TicketTierController } from './ticket-tier.controller';
import { TicketTierService } from './ticket-tier.service';
import { TicketTierRepository } from './ticket-tier.repository';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate, requireRoles } from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import {
  createTicketTierSchema,
  eventIdQuerySchema,
  ticketTierIdParamSchema,
} from './ticket-tier.validator';

const router = Router();

const ticketTierRepository = new TicketTierRepository();
const ticketTierService = new TicketTierService(ticketTierRepository);
const ticketTierController = new TicketTierController(ticketTierService);

router.post(
  '/',
  authenticate,
  requireRoles(UserRole.ORGANIZER, UserRole.ADMIN),
  validateRequest(createTicketTierSchema),
  ticketTierController.createTicketTier
);
router.get('/', validateRequest(eventIdQuerySchema), ticketTierController.getTicketTiers);
router.get('/:id', validateRequest(ticketTierIdParamSchema), ticketTierController.getTicketTierById);

export { router as ticketTierRoutes };
