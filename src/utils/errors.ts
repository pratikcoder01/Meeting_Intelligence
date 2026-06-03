import { StatusCodes } from 'http-status-codes';

// =============================================================================
//  AppError — base class for all operational errors
// =============================================================================

/**
 * Base error class for ALL expected/operational errors in the application.
 *
 * `isOperational = true` tells the global error handler that this error is
 * safe to surface to the client. Programming bugs (ReferenceError, TypeError,
 * etc.) have `isOperational = false` and result in a generic 500.
 *
 * @param message     Human-readable description shown to the client.
 * @param statusCode  HTTP status code.
 * @param code        Machine-readable SCREAMING_SNAKE_CASE identifier.
 * @param details     Optional field-level validation errors or extra context.
 * @param isOperational Set to false only for non-recoverable programming bugs.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    code = 'INTERNAL_ERROR',
    details?: unknown,
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// =============================================================================
//  Specific error subclasses
// =============================================================================

/** 422 — request body failed Zod/schema validation. */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', details);
  }
}

/** 400 — malformed request (wrong type, missing required field, etc.). */
export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, StatusCodes.BAD_REQUEST, 'BAD_REQUEST', details);
  }
}

/** 401 — no token, expired token, or invalid signature. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

/** 403 — valid token but insufficient role / permission. */
export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, StatusCodes.FORBIDDEN, 'FORBIDDEN');
  }
}

/** 404 — entity not found in the database. */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const msg = identifier
      ? `${resource} with identifier '${identifier}' was not found`
      : `${resource} was not found`;
    super(msg, StatusCodes.NOT_FOUND, 'NOT_FOUND');
  }
}

/** 409 — unique constraint violation (e.g., email already taken). */
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, StatusCodes.CONFLICT, 'CONFLICT', details);
  }
}

/** 429 — client has exceeded the rate limit. */
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, StatusCodes.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS');
  }
}

/** 503 — downstream dependency (DB, external API) is unavailable. */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, StatusCodes.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE');
  }
}
