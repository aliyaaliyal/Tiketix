import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    // SEC-02: organizerId is NEVER accepted from the client (BOLA fix).
    // The controller derives it from req.user.id (ADMIN may override).
    title: z.string().min(3, 'Title must be at least 3 characters'),
    slug: z
      .string()
      .min(3, 'Slug must be at least 3 characters')
      .regex(/^[a-z0-9-]+$/, 'Slug must be URL friendly (lowercase, numbers, dashes)'),
    description: z.string().optional(),
    venueName: z.string().min(2, 'Venue name is required'),
    venueAddress: z.string().optional(),
    posterUrl: z.string().optional(),
    bannerUrl: z.string().optional(),
    eventDate: z.string().datetime({ message: 'eventDate must be a valid ISO 8601 string' }),
    endTime: z.string().datetime({ message: 'endTime must be a valid ISO 8601 string' }).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED']).optional().default('PUBLISHED'),
    ticketTiers: z
      .array(
        z.object({
          name: z.string().min(2, 'Tier name is required'),
          description: z.string().optional(),
          price: z.coerce.number().min(0, 'Price cannot be negative'),
          totalQuota: z.coerce.number().int().min(1, 'Total quota must be at least 1'),
        })
      )
      .optional(),
  }),
});

export const organizerAttendeesQuerySchema = z.object({
  query: z.object({
    eventId: z.string().uuid('Invalid event UUID').optional(),
    search: z.string().optional(),
  }),
});

export const eventSlugParamSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Slug is required'),
  }),
});

export const eventIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event UUID'),
  }),
});

export type CreateEventInput = z.infer<typeof createEventSchema>['body'] & {
  // Injected server-side from req.user.id (ADMIN may override via query).
  organizerId: string;
};

