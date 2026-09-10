import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string({ message: "name is required" })
    .trim()
    .min(1, "name is required")
    .max(120, "name must be at most 120 characters"),
});
