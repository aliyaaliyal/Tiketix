import { z } from 'zod';

export const attendeeInputSchema = z.object({
  ticketTierId: z.string().uuid('Invalid ticket tier UUID'),
  name: z.string().min(2, 'Attendee name must be at least 2 characters'),
  email: z.string().email('Invalid attendee email address'),
});

// Demo-friendly channels. No real money moves: SIMULATOR/QRIS/VA/CC are all
// settled by the local SimulatedPSP. Swapping to Midtrans/Xendit later only
// means implementing the same intent/settle interface server-side.
export const paymentMethodSchema = z.enum(['QRIS', 'VA', 'CC', 'SIMULATOR']);

export const processPaymentSchema = z.object({
  body: z.object({
    bookingCode: z.string().min(1, 'Booking code is required'),
    paymentGateway: z.string().optional().default('SIMULATOR'),
    paymentMethod: paymentMethodSchema.optional().default('SIMULATOR'),
    attendees: z.array(attendeeInputSchema).optional(),
  }),
});

export const createIntentSchema = z.object({
  body: z.object({
    bookingCode: z.string().min(1, 'Booking code is required'),
    paymentMethod: paymentMethodSchema.optional().default('QRIS'),
  }),
});

export const paymentIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid payment transaction UUID'),
  }),
});

export const paymentBookingCodeParamSchema = z.object({
  params: z.object({
    bookingCode: z.string().min(1, 'Booking code is required'),
  }),
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>['body'];
