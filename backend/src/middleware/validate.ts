import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { AppError } from "../shared/errors.js";

/**
 * Validates and replaces `req.body` with the parsed/normalized result.
 */
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));

      next(
        new AppError(
          422,
          "VALIDATION_ERROR",
          "Request validation failed",
          details,
        ),
      );
      return;
    }

    req.body = result.data;
    next();
  };
