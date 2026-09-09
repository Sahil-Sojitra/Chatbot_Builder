export type ErrorCode =
  | "VALIDATION_ERROR"
  | "EMAIL_ALREADY_EXISTS"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_DEACTIVATED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export const emailAlreadyExists = (): AppError =>
  new AppError(
    409,
    "EMAIL_ALREADY_EXISTS",
    "A user with this email already exists",
  );

export const invalidCredentials = (): AppError =>
  new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");

export const accountSuspended = (): AppError =>
  new AppError(403, "ACCOUNT_SUSPENDED", "This account has been suspended");

export const accountDeactivated = (): AppError =>
  new AppError(403, "ACCOUNT_DEACTIVATED", "This account has been deactivated");

export const unauthorized = (
  message = "Authentication required",
): AppError => new AppError(401, "UNAUTHORIZED", message);
