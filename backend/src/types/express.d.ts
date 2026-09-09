import "express";

declare global {
  namespace Express {
    interface Request {
      /** Populated by the auth middleware for protected routes. */
      auth?: {
        userId: string;
        sessionId: string;
      };
    }
  }
}

export {};
