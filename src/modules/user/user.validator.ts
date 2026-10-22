import { z } from 'zod';

export const registerUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['ORGANIZER', 'ATTENDEE']).optional().default('ATTENDEE'),
    phoneNumber: z.string().optional(),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user UUID'),
  }),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>['body'];
