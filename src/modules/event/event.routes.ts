import { Router } from 'express';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { EventRepository } from './event.repository';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate, requireRoles } from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { uploadPosterMiddleware } from '../../middlewares/upload';
import {
  createEventSchema,
  eventSlugParamSchema,
  eventIdParamSchema,
  organizerAttendeesQuerySchema,
} from './event.validator';

const router = Router();

const eventRepository = new EventRepository();
const eventService = new EventService(eventRepository);
const eventController = new EventController(eventService);

router.post(
  '/upload-poster',
  authenticate,
  requireRoles(UserRole.ORGANIZER, UserRole.ADMIN),
  uploadPosterMiddleware.single('poster'),
  eventController.uploadPoster
);

router.post(
  '/',
  authenticate,
  requireRoles(UserRole.ORGANIZER, UserRole.ADMIN),
  validateRequest(createEventSchema),
  eventController.createEvent
);
router.get('/', eventController.getAllEvents);

// Organizer specific routes (must precede /:id)
router.get(
  '/organizer/dashboard',
  authenticate,
  requireRoles(UserRole.ORGANIZER, UserRole.ADMIN),
  eventController.getOrganizerDashboard
);
router.get(
  '/organizer/attendees',
  authenticate,
  requireRoles(UserRole.ORGANIZER, UserRole.ADMIN),
  validateRequest(organizerAttendeesQuerySchema),
  eventController.getOrganizerAttendees
);

router.get('/slug/:slug', validateRequest(eventSlugParamSchema), eventController.getEventBySlug);
router.get('/:id', validateRequest(eventIdParamSchema), eventController.getEventById);

export { router as eventRoutes };

