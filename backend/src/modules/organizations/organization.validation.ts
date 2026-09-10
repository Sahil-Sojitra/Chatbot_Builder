import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string({ message: "name is required" })
    .trim()
    .min(1, "name is required")
    .max(120, "name must be at most 120 characters"),
});

/**
 * PATCH /api/v1/organization — name is the only editable field in V1.
 * `.strict()` rejects any other key outright (ownerId, status, slug, id,
 * etc. must never even parse successfully) and the refine blocks a no-op
 * empty update, matching updateMeSchema's convention.
 */
export const updateOrganizationSchema = z
  .object({
    name: z
      .string({ message: "name must be a string" })
      .trim()
      .min(1, "name cannot be empty")
      .max(120, "name must be at most 120 characters")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
