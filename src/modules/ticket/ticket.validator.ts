import { z } from 'zod';

export const qrHashParamSchema = z.object({
  params: z.object({
    qrHash: z.string().min(1, 'qrHash is required'),
  }),
});

export const ticketIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket UUID'),
  }),
});

export const bookingIdQuerySchema = z.object({
  query: z.object({
    bookingId: z.string().uuid('Invalid booking UUID').optional(),
  }),
});
