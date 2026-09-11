// import "express";

// declare global {
//   namespace Express {
//     interface Request {
//       /** Populated by the auth middleware for protected routes. */
//       auth?: {
//         userId: string;
//       };
//     }
//   }
// }

// export {};


// backend/src/types/express.d.ts
import "express";

declare module "express-serve-static-core" {
  interface Request {
    /** Populated by the auth middleware for protected routes. */
    auth?: {
      userId: string;
    };
  }
}