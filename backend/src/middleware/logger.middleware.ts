import type { NextFunction, Request, Response } from "express";
import { logger } from "../shared/logger.js";

/**
 * Express middleware that intercepts all incoming HTTP requests and logs:
 * - Method, URL, status code
 * - Total request processing duration in milliseconds
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();
  const path = req.originalUrl || req.url;

  res.on("finish", () => {
    const duration = performance.now() - start;
    logger.http(req.method, path, res.statusCode, duration);
  });

  next();
}
