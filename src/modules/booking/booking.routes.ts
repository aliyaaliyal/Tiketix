import { Router } from 'express';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingRepository } from './booking.repository';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate } from '../../middlewares/auth';
import {
  createBookingSchema,
  bookingCodeParamSchema,
  bookingIdParamSchema,
  bookingListQuerySchema,
} from './booking.validator';

const router = Router();

const bookingRepository = new BookingRepository();
const bookingService = new BookingService(bookingRepository);
const bookingController = new BookingController(bookingService);

router.post('/', authenticate, validateRequest(createBookingSchema), bookingController.createBooking);
// SEC-04: validate ?userId=&page=&limit= before the controller reads them.
router.get('/', authenticate, validateRequest(bookingListQuerySchema), bookingController.getUserBookings);
// SEC-01: booking detail by code is no longer public; ownership enforced in service.
router.get(
  '/code/:bookingCode',
  authenticate,
  validateRequest(bookingCodeParamSchema),
  bookingController.getBookingByCode
);
// Same ownership rule as /code/:bookingCode (owner / organizer / admin).
router.get(
  '/:id',
  authenticate,
  validateRequest(bookingIdParamSchema),
  bookingController.getBookingById
);
router.post(
  '/:id/cancel',
  authenticate,
  validateRequest(bookingIdParamSchema),
  bookingController.cancelBooking
);

export { router as bookingRoutes };
