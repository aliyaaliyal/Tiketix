import { Request, Response, NextFunction } from 'express';
import { BookingService } from './booking.service';
import { sendCreated, sendSuccess } from '../../common/response';
import { UnauthorizedError } from '../../common/errors';

export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  createBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // SEC-04: owner is always the authenticated user; never trust client body.
      if (!req.user?.id) {
        throw new UnauthorizedError('Authentication is required to create a booking');
      }
      const booking = await this.bookingService.createBooking({
        ...req.body,
        userId: req.user.id,
      });
      return sendCreated(res, booking, 'Booking created successfully');
    } catch (error) {
      return next(error);
    }
  };

  getBookingByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookingCode = req.params.bookingCode as string;
      // SEC-01: ownership / organizer / admin check happens in the service.
      const booking = await this.bookingService.getBookingByCode(bookingCode, req.user!);
      return sendSuccess(res, booking);
    } catch (error) {
      return next(error);
    }
  };

  getBookingById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      // SEC-01 (same class): booking detail by id requires ownership check too.
      const booking = await this.bookingService.getBookingById(id, req.user!);
      return sendSuccess(res, booking);
    } catch (error) {
      return next(error);
    }
  };

  getUserBookings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validated + coerced by `bookingListQuerySchema` (page/limit/userId).
      const { userId, page, limit } = req.query as unknown as {
        userId?: string;
        page: number;
        limit: number;
      };
      const result = await this.bookingService.getUserBookings(req.user!, {
        userId,
        page,
        limit,
      });
      return sendSuccess(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      return next(error);
    }
  };

  cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const booking = await this.bookingService.cancelBooking(id, req.user!);
      return sendSuccess(res, booking, 'Booking cancelled and quota released successfully');
    } catch (error) {
      return next(error);
    }
  };
}
