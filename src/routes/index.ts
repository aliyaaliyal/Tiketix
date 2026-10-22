import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { userRoutes } from '../modules/user/user.routes';
import { eventRoutes } from '../modules/event/event.routes';
import { ticketTierRoutes } from '../modules/ticket-tier/ticket-tier.routes';
import { bookingRoutes } from '../modules/booking/booking.routes';
import { paymentRoutes } from '../modules/payment/payment.routes';
import { ticketRoutes } from '../modules/ticket/ticket.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/ticket-tiers', ticketTierRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/tickets', ticketRoutes);

export { router as apiRouter };
