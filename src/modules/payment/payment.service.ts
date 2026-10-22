import crypto from 'crypto';
import { prisma } from '../../config/database';
import { PaymentRepository } from './payment.repository';
import { ProcessPaymentInput } from './payment.validator';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors';
import { AuthUser } from '../../types/express';
import { BookingStatus, PaymentStatus, UserRole } from '@prisma/client';

// ── SimulatedPSP: fake-but-realistic payment artefacts for demos ─────────
// No real money moves. Each method yields displayable instructions:
// QRIS -> qrPayload string (rendered as QR on the frontend)
// VA   -> vaNumber (8808 + 10 digits, copyable)
// CC   -> masked card hint. `simulateAutoSettleMs` lets the frontend
// countdown a "verifying with bank..." moment before calling /pay.
function buildSimulatedInstruction(paymentMethod: string, bookingCode: string) {
  const ref = crypto.randomBytes(4).toString('hex').toUpperCase();
  if (paymentMethod === 'VA') {
    const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
    return {
      vaNumber: `8808${digits}`,
      bankName: 'Bank Demo Nasional',
      reference: ref,
    };
  }
  if (paymentMethod === 'CC') {
    return {
      cardHint: '4111 •••• •••• 1111 (kartu demo, tidak didebet)',
      reference: ref,
    };
  }
  // QRIS default (also covers SIMULATOR)
  return {
    qrPayload: `TIKETIX-QRIS-SIM:${bookingCode}:${ref}`,
    nmid: `ID1024${ref}`,
    reference: ref,
  };
}

export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  // Step 1 of the demo flow: lock a PENDING "bill" with realistic
  // pay instructions. Idempotent per booking (safe to refresh / re-click).
  async createIntent(bookingCode: string, paymentMethod: string, currentUser: AuthUser) {
    const booking = await prisma.booking.findUnique({
      where: { bookingCode },
      include: { event: true },
    });
    if (!booking) {
      throw new NotFoundError(`Booking with code '${bookingCode}' not found`);
    }
    if (currentUser.role !== UserRole.ADMIN && booking.userId !== currentUser.id) {
      throw new ForbiddenError('You are not authorized to create a payment for this booking');
    }
    if (booking.status === BookingStatus.PAID) {
      throw new BadRequestError('Booking has already been paid and settled.');
    }
    if (booking.status === BookingStatus.EXPIRED || new Date() > booking.expiresAt) {
      throw new BadRequestError('Booking has expired and can no longer be paid.');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestError('Booking has been cancelled.');
    }

    const method = paymentMethod || 'QRIS';
    const instruction = buildSimulatedInstruction(method, booking.bookingCode);
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const payment = await this.paymentRepository.createIntent({
      bookingId: booking.id,
      transactionCode: `PAY-${booking.bookingCode}-${randomHex}`,
      paymentGateway: 'SIMULATOR',
      amount: Number(booking.totalAmount),
      payload: {
        paymentMethod: method,
        instruction,
        isSimulated: true,
        requestedBy: currentUser.email,
        requestedAt: new Date().toISOString(),
      },
    });
    const payload = (payment.payload ?? {}) as Record<string, unknown>;
    return {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      totalAmount: Number(booking.totalAmount),
      expiresAt: booking.expiresAt,
      status: booking.status,
      payment: {
        id: payment.id,
        transactionCode: payment.transactionCode,
        paymentMethod: (payload.paymentMethod as string) ?? method,
        instruction: (payload.instruction as Record<string, unknown>) ?? instruction,
        status: payment.status,
      },
    };
  }

  async getIntentStatus(bookingCode: string, currentUser: AuthUser) {
    const booking = await prisma.booking.findUnique({ where: { bookingCode } });
    if (!booking) {
      throw new NotFoundError(`Booking with code '${bookingCode}' not found`);
    }
    if (currentUser.role !== UserRole.ADMIN && booking.userId !== currentUser.id) {
      throw new ForbiddenError('You are not authorized to view payments for this booking');
    }
    const latest =
      (await this.paymentRepository.findByBookingId(booking.id))[0] ?? null;
    return {
      bookingCode: booking.bookingCode,
      bookingStatus: booking.status,
      expiresAt: booking.expiresAt,
      // Surface the newest transaction (PENDING intent or SETTLEMENT receipt).
      payment: latest
        ? {
            id: latest.id,
            transactionCode: latest.transactionCode,
            status: latest.status,
            paidAt: latest.paidAt,
            payload: latest.payload,
          }
        : null,
    };
  }

  async processPayment(input: ProcessPaymentInput, currentUser: AuthUser) {
    // 1. Fetch booking with items and event
    const booking = await prisma.booking.findUnique({
      where: { bookingCode: input.bookingCode },
      include: {
        bookingItems: {
          include: {
            ticketTier: true,
          },
        },
        event: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError(`Booking with code '${input.bookingCode}' not found`);
    }

    // 2. Authorization check: Only booking owner or admin can pay
    if (currentUser.role !== UserRole.ADMIN && booking.userId !== currentUser.id) {
      throw new ForbiddenError('You are not authorized to process payment for this booking');
    }

    // 3. Status checks
    // Idempotent settle: if already PAID, return the existing receipt +
    // tickets instead of 400, so double-clicks / retries are harmless.
    if (booking.status === BookingStatus.PAID) {
      const existing = await this.paymentRepository.findByBookingId(booking.id);
      const settlement = existing.find((p) => p.status === PaymentStatus.SETTLEMENT);
      if (settlement) {
        const existingTickets = await prisma.ticket.findMany({
          where: { bookingId: booking.id },
          include: { ticketTier: true },
        });
        return {
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          totalAmount: Number(booking.totalAmount),
          status: BookingStatus.PAID,
          payment: settlement,
          ticketsCount: existingTickets.length,
          tickets: existingTickets,
          alreadySettled: true,
        };
      }
      throw new BadRequestError('Booking has already been paid and settled.');
    }

    if (booking.status === BookingStatus.EXPIRED) {
      throw new BadRequestError('Booking has expired and can no longer be paid.');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestError('Booking has been cancelled.');
    }

    // 4. Expiry check against current time
    if (new Date() > booking.expiresAt) {
      throw new BadRequestError(
        'Booking expiration time has passed. Please create a new reservation.'
      );
    }

    // 4b. Attendee count must match the reserved quantity exactly so the
    // printed tickets / CSV export stay accurate (no silent fallbacks).
    const totalQty = booking.bookingItems.reduce((sum, i) => sum + i.quantity, 0);
    if (input.attendees && input.attendees.length !== totalQty) {
      throw new BadRequestError(
        `Jumlah data pemegang tiket (${input.attendees.length}) harus sama dengan jumlah tiket dipesan (${totalQty}).`
      );
    }

    // 5. Generate transaction code
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const transactionCode = `PAY-${booking.bookingCode}-${randomHex}`;

    // 6. Prepare tickets data
    const remainingAttendees = input.attendees ? [...input.attendees] : [];
    const ticketsData: Array<{
      bookingId: string;
      bookingItemId: string;
      ticketTierId: string;
      ticketCode: string;
      qrHash: string;
      attendeeName: string;
      attendeeEmail: string;
    }> = [];

    const eventPrefix = booking.event.slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();

    for (const item of booking.bookingItems) {
      for (let i = 0; i < item.quantity; i++) {
        // Find attendee matching tier if specified
        let attendeeName = booking.user.name;
        let attendeeEmail = booking.user.email;

        const attendeeIndex = remainingAttendees.findIndex(
          (a) => a.ticketTierId === item.ticketTierId
        );
        if (attendeeIndex !== -1) {
          attendeeName = remainingAttendees[attendeeIndex].name;
          attendeeEmail = remainingAttendees[attendeeIndex].email;
          remainingAttendees.splice(attendeeIndex, 1);
        }

        const ticketRand = crypto.randomBytes(4).toString('hex').toUpperCase();
        const ticketCode = `TKT-${eventPrefix}-${ticketRand}`;

        // Cryptographic QR hash
        const rawHashContent = `${ticketCode}-${booking.id}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
        const qrHash = crypto.createHash('sha256').update(rawHashContent).digest('hex');

        ticketsData.push({
          bookingId: booking.id,
          bookingItemId: item.id,
          ticketTierId: item.ticketTierId,
          ticketCode,
          qrHash,
          attendeeName,
          attendeeEmail,
        });
      }
    }

    // 7. Settle payment and issue tickets atomically
    const result = await this.paymentRepository.settlePaymentAndIssueTickets({
      bookingId: booking.id,
      paymentData: {
        transactionCode,
        paymentGateway: input.paymentGateway || 'MANUAL',
        amount: Number(booking.totalAmount),
        payload: {
          paymentMethod: input.paymentMethod || 'SIMULATOR',
          paidBy: currentUser.email,
          processedAt: new Date().toISOString(),
        },
      },
      ticketsData,
    });

    return {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      totalAmount: Number(booking.totalAmount),
      status: BookingStatus.PAID,
      payment: result.payment,
      ticketsCount: result.tickets.length,
      tickets: result.tickets,
      alreadySettled: result.alreadySettled,
    };
  }

  async getPaymentById(id: string, currentUser: AuthUser) {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundError('Payment transaction not found');
    }

    const booking = (payment as any).booking;
    if (
      currentUser.role !== UserRole.ADMIN &&
      booking &&
      booking.userId !== currentUser.id
    ) {
      throw new ForbiddenError('You are not authorized to view this payment transaction');
    }

    return payment;
  }

  async getPaymentsByBookingCode(bookingCode: string, currentUser: AuthUser) {
    const booking = await prisma.booking.findUnique({
      where: { bookingCode },
    });

    if (!booking) {
      throw new NotFoundError(`Booking with code '${bookingCode}' not found`);
    }

    if (currentUser.role !== UserRole.ADMIN && booking.userId !== currentUser.id) {
      throw new ForbiddenError('You are not authorized to view payments for this booking');
    }

    return this.paymentRepository.findByBookingId(booking.id);
  }
}
