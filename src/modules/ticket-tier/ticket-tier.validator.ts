import { z } from 'zod';

export const createTicketTierSchema = z.object({
  body: z.object({
    eventId: z.string().uuid('Invalid event UUID'),
    name: z.string().min(2, 'Tier name is required'),
    description: z.string().optional(),
    price: z.coerce.number().min(0, 'Price cannot be negative'),
    totalQuota: z.coerce.number().int().min(1, 'Total quota must be at least 1'),
    startSaleDate: z.string().datetime().optional(),
    endSaleDate: z.string().datetime().optional(),
  }),
});

export const eventIdQuerySchema = z.object({
  query: z.object({
    eventId: z.string().uuid('Invalid event UUID').optional(),
  }),
});

export const ticketTierIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket tier UUID'),
  }),
});

export type CreateTicketTierInput = z.infer<typeof createTicketTierSchema>['body'];
