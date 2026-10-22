import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { sendSuccess } from '../../common/response';

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // Demo flow step 1: create (or reuse) a PENDING bill with pay instructions.
  createIntent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bookingCode, paymentMethod } = req.body;
      const result = await this.paymentService.createIntent(bookingCode, paymentMethod, req.user!);
      return sendSuccess(res, result, 'Payment instructions created (simulated, no real money moved)');
    } catch (error) {
      return next(error);
    }
  };

  getIntentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookingCode = req.params.bookingCode as string;
      const result = await this.paymentService.getIntentStatus(bookingCode, req.user!);
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  // Demo flow step 2 (+ legacy single-step): settle the PENDING bill and
  // issue e-tickets. Idempotent: repeat calls return the same receipt.
  processPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.paymentService.processPayment(req.body, req.user!);
      const message = (result as { alreadySettled?: boolean }).alreadySettled
        ? 'Payment already settled — returning existing tickets (no duplicate charge)'
        : 'Payment processed successfully and tickets issued';
      return sendSuccess(res, result, message);
    } catch (error) {
      return next(error);
    }
  };

  getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const payment = await this.paymentService.getPaymentById(id, req.user!);
      return sendSuccess(res, payment);
    } catch (error) {
      return next(error);
    }
  };

  getPaymentsByBookingCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookingCode = req.params.bookingCode as string;
      const payments = await this.paymentService.getPaymentsByBookingCode(
        bookingCode,
        req.user!
      );
      return sendSuccess(res, payments);
    } catch (error) {
      return next(error);
    }
  };
}
