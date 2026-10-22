import { z } from 'zod';

export const createBookingItemSchema = z.object({
  ticketTierId: z.string().uuid('Invalid ticket tier UUID'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
});

export const createBookingSchema = z.object({
  body: z.object({
    // SEC-04 hardening: userId is never trusted from client body.
    // The booking owner is always `req.user.id`. Unknown keys are stripped by zod.
    eventId: z.string().uuid('Invalid event UUID'),
    items: z.array(createBookingItemSchema).min(1, 'Must include at least 1 ticket item'),
  }),
});

export const bookingCodeParamSchema = z.object({
  params: z.object({
    bookingCode: z.string().min(1, 'Booking code is required'),
  }),
});

export const bookingIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid booking UUID'),
  }),
});

export const bookingListQuerySchema = z.object({
  query: z.object({
    // Only ADMIN may filter by another user's id; others are forced to their own id.
    userId: z.string().uuid('Invalid user UUID').optional(),
    page: z.coerce.number().int().min(1, 'Page must be >= 1').default(1),
    limit: z.coerce.number().int().min(1).max(50, 'Limit max is 50').default(10),
  }),
});

export type BookingListQuery = z.infer<typeof bookingListQuerySchema>['query'];

export type CreateBookingInput = z.infer<typeof createBookingSchema>['body'] & {
  // Injected server-side from req.user.id (never from client body).
  userId: string;
};
