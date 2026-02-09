import { z } from "zod";

export const ErrorResponse = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string().optional(),
    details: z.any().optional(),
  }),
});

export const Success = <T extends z.ZodTypeAny>(data: T) => z.object({ success: z.literal(true), data });

export const UserSummary = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  emailVerified: z.boolean(),
});

export const MessageResponse = Success(z.object({ message: z.string() }));

export const PaginationMeta = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const PaginationQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});


