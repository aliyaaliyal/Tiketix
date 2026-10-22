import { prisma } from '../../config/database';
import { BookingStatus, PaymentStatus, PaymentTransaction, Ticket } from '@prisma/client';
import { BadRequestError } from '../../common/errors';

export interface SettlePaymentParams {
  bookingId: string;
  paymentData: {
    transactionCode: string;
    paymentGateway: string;
    amount: number;
    payload?: any;
  };
  ticketsData: Array<{
    bookingId: string;
    bookingItemId: string;
    ticketTierId: string;
    ticketCode: string;
    qrHash: string;
    attendeeName: string;
    attendeeEmail: string;
  }>;
}

export class PaymentRepository {
  async findById(id: string): Promise<PaymentTransaction | null> {
    return prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            event: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  async findByTransactionCode(transactionCode: string): Promise<PaymentTransaction | null> {
    return prisma.paymentTransaction.findUnique({
      where: { transactionCode },
      include: {
        booking: {
          include: {
            event: true,
          },
        },
      },
    });
  }

  async findByBookingId(bookingId: string): Promise<PaymentTransaction[]> {
    return prisma.paymentTransaction.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Create (or reuse) a PENDING payment intent for a booking.
  // Idempotent per booking: retrying returns the existing PENDING intent
  // instead of minting a second VA/QR. Safe for double-clicks & refresh.
  async createIntent(params: {
    bookingId: string;
    transactionCode: string;
    paymentGateway: string;
    amount: number;
    payload?: any;
  }): Promise<PaymentTransaction> {
    const existing = await prisma.paymentTransaction.findFirst({
      where: { bookingId: params.bookingId, status: PaymentStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    try {
      return await prisma.paymentTransaction.create({
        data: {
          bookingId: params.bookingId,
          transactionCode: params.transactionCode,
          paymentGateway: params.paymentGateway,
          amount: params.amount,
          status: PaymentStatus.PENDING,
          payload: params.payload,
        },
      });
    } catch (err: any) {
      // Race: two intents created concurrently -> return the winner.
      if (err?.code === 'P2002') {
        const winner = await prisma.paymentTransaction.findFirst({
          where: { bookingId: params.bookingId, status: PaymentStatus.PENDING },
          orderBy: { createdAt: 'desc' },
        });
        if (winner) return winner;
      }
      throw err;
    }
  }

  async findPendingIntentByBookingId(bookingId: string): Promise<PaymentTransaction | null> {
    return prisma.paymentTransaction.findFirst({
      where: { bookingId, status: PaymentStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
  }

  async settlePaymentAndIssueTickets(params: SettlePaymentParams): Promise<{
    payment: PaymentTransaction;
    tickets: Ticket[];
    alreadySettled: boolean;
  }> {
    return prisma.$transaction(async (tx) => {
      // 1. Optimistic Lock: Atomically update Booking status to PAID ONLY IF it is currently PENDING
      const updateResult = await tx.booking.updateMany({
        where: {
          id: params.bookingId,
          status: BookingStatus.PENDING,
        },
        data: {
          status: BookingStatus.PAID,
        },
      });

      // Idempotent retry: booking already PAID by an earlier call.
      // Return the existing SETTLEMENT + tickets instead of erroring,
      // so double-clicks / webhook retries never mint duplicate tickets.
      if (updateResult.count === 0) {
        const existingPayment = await tx.paymentTransaction.findFirst({
          where: { bookingId: params.bookingId, status: PaymentStatus.SETTLEMENT },
          orderBy: { createdAt: 'desc' },
        });
        if (existingPayment) {
          const existingTickets = await tx.ticket.findMany({
            where: { bookingId: params.bookingId },
            include: { ticketTier: true },
          });
          return { payment: existingPayment, tickets: existingTickets, alreadySettled: true };
        }
        throw new BadRequestError('Booking has already been paid, expired, or cancelled');
      }

      // 2. Create PaymentTransaction with SETTLEMENT status
      const payment = await tx.paymentTransaction.create({
        data: {
          bookingId: params.bookingId,
          transactionCode: params.paymentData.transactionCode,
          paymentGateway: params.paymentData.paymentGateway,
          amount: params.paymentData.amount,
          status: PaymentStatus.SETTLEMENT,
          paidAt: new Date(),
          payload: params.paymentData.payload,
        },
      });

      // Close any leftover PENDING intents so history stays clean
      // (latest query keeps returning the SETTLEMENT receipt).
      await tx.paymentTransaction.updateMany({
        where: {
          bookingId: params.bookingId,
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.EXPIRED },
      });

      // 3. Issue individual e-tickets with unique codes and QR hashes (bulk insert)
      await tx.ticket.createMany({
        data: params.ticketsData.map((ticket) => ({
          bookingId: ticket.bookingId,
          bookingItemId: ticket.bookingItemId,
          ticketTierId: ticket.ticketTierId,
          ticketCode: ticket.ticketCode,
          qrHash: ticket.qrHash,
          attendeeName: ticket.attendeeName,
          attendeeEmail: ticket.attendeeEmail,
        })),
      });
      const createdTickets = await tx.ticket.findMany({
        where: { bookingId: params.bookingId },
        include: { ticketTier: true },
      });

      return { payment, tickets: createdTickets, alreadySettled: false };
    });
  }
}
