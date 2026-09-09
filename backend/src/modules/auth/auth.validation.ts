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
