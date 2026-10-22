import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate } from '../../middlewares/auth';
import {
  processPaymentSchema,
  createIntentSchema,
  paymentBookingCodeParamSchema,
  paymentIdParamSchema,
} from './payment.validator';

const router = Router();

const paymentRepository = new PaymentRepository();
const paymentService = new PaymentService(paymentRepository);
const paymentController = new PaymentController(paymentService);

// Demo two-step flow: intent (PENDING bill + VA/QR instructions) then pay (settle).
// `POST /pay` stays backward-compatible: it also settles a booking that has
// no intent yet, so old clients keep working.
router.post('/intent', authenticate, validateRequest(createIntentSchema), paymentController.createIntent);
router.get(
  '/intent/:bookingCode',
  authenticate,
  validateRequest(paymentBookingCodeParamSchema),
  paymentController.getIntentStatus
);
router.post('/pay', authenticate, validateRequest(processPaymentSchema), paymentController.processPayment);
router.get(
  '/code/:bookingCode',
  authenticate,
  validateRequest(paymentBookingCodeParamSchema),
  paymentController.getPaymentsByBookingCode
);
router.get(
  '/:id',
  authenticate,
  validateRequest(paymentIdParamSchema),
  paymentController.getPaymentById
);

export { router as paymentRoutes };
