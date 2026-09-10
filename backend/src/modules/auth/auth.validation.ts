import { z } from "zod";

/** Shared, consistent email normalization: trim + lowercase, then validate. */
const emailSchema = z
  .string({ message: "email is required" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "A valid email is required" }));

const passwordSchema = z
  .string({ message: "password is required" })
  .min(8, "password must be at least 8 characters")
  .max(128, "password must be at most 128 characters");

export const registerSchema = z.object({
  name: z
    .string({ message: "name is required" })
    .trim()
    .min(1, "name is required")
    .max(120, "name must be at most 120 characters"),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ message: "password is required" }).min(1, "password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z
    .string({ message: "refreshToken is required" })
    .min(1, "refreshToken is required"),
});

/**
 * PATCH /api/v1/me — only genuinely user-editable profile fields. `.strict()`
 * rejects any other key outright (protected fields like status, email,
 * emailVerified, passwordHash, id must never even parse successfully) and
 * the refine blocks a no-op empty update.
 */
export const updateMeSchema = z
  .object({
    name: z
      .string({ message: "name must be a string" })
      .trim()
      .min(1, "name cannot be empty")
      .max(120, "name must be at most 120 characters")
      .optional(),
    avatarUrl: z
      .url({ message: "avatarUrl must be a valid URL" })
      .max(2048, "avatarUrl must be at most 2048 characters")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
