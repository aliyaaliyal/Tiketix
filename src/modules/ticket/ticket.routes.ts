import { Router } from 'express';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { TicketRepository } from './ticket.repository';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate, requireRoles } from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import {
  qrHashParamSchema,
  ticketIdParamSchema,
  bookingIdQuerySchema,
} from './ticket.validator';

const router = Router();

const ticketRepository = new TicketRepository();
const ticketService = new TicketService(ticketRepository);
const ticketController = new TicketController(ticketService);

router.get('/', authenticate, validateRequest(bookingIdQuerySchema), ticketController.getTicketsByBooking);
router.get(
  '/qr/:qrHash',
  authenticate,
  requireRoles(UserRole.ORGANIZER, UserRole.ADMIN),
  validateRequest(qrHashParamSchema),
  ticketController.getTicketByQrHash
);
router.post(
  '/checkin/:qrHash',
  authenticate,
  requireRoles(UserRole.ORGANIZER, UserRole.ADMIN),
  validateRequest(qrHashParamSchema),
  ticketController.checkIn
);
router.get('/my-tickets', authenticate, ticketController.getMyTickets);
router.get('/:id', authenticate, validateRequest(ticketIdParamSchema), ticketController.getTicketById);

export { router as ticketRoutes };
