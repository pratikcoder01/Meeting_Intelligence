/**
 * error.middleware.ts
 *
 * Two Express error-handling middleware functions:
 *
 *  notFoundHandler    — Catches requests that matched no route (404).
 *  globalErrorHandler — Terminal error handler; must be the LAST middleware
 *                       registered. Formats every thrown error into the
 *                       unified response envelope.
 *
 * Envelope shapes:
 *
 *  Operational error (AppError subclass):
 *    HTTP <statusCode>
 *    { traceId, success: false, error: { code, message, details? } }
 *
 *  Programming error (unexpected):
 *    HTTP 500
 *    { traceId, success: false, error: { code: 'INTERNAL_SERVER_ERROR', message } }
 *    (stack trace only included in non-production environments)
 *
 * Logging policy:
 *  - 5xx errors → logger.error (always)
 *  - 4xx errors → logger.warn
 *  - errorDetails (stack, context) are always logged but never leaked to clients
 *    in production.
 */

import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '@/utils/errors';
import { sendError } from '@/utils/response';
import { logger } from '@/utils/logger';
import { config } from '@/config';
import { TraceableRequest } from '@/types';

// ─── 404 handler ─────────────────────────────────────────────────────────────

/**
 * Catches requests that did not match any registered route.
 * Must be registered AFTER all routes, BEFORE globalErrorHandler.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const traceId = (req as TraceableRequest).traceId ?? 'unknown';

  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    traceId,
  });

  sendError(res, StatusCodes.NOT_FOUND, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
};

// ─── Global error handler ─────────────────────────────────────────────────────

/**
 * Receives errors thrown by route handlers and other middleware.
 * Express identifies error-handling middleware by the 4-argument signature
 * (err, req, res, next) — the `_next` parameter must be present.
 */
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const traceId = (req as TraceableRequest).traceId ?? 'unknown';

  // ── Operational errors ────────────────────────────────────────────────
  if (err instanceof AppError && err.isOperational) {
    const logLevel = err.statusCode >= 500 ? 'error' : 'warn';

    const logMeta: Record<string, unknown> = {
      traceId,
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      method: req.method,
      path: req.path,
    };
    if (err.details !== undefined) {
      logMeta['errorDetails'] = err.details;
    }

    logger[logLevel]('Operational error', logMeta);

    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // ── Unexpected / programming errors ───────────────────────────────────
  // These should NEVER happen in normal operation. Log full details for
  // debugging but never expose stack traces or internals to clients.
  logger.error('Unexpected error', {
    traceId,
    message: err.message,
    errorDetails: err.stack,
    method: req.method,
    path: req.path,
  });

  const clientMessage = config.app.isProduction
    ? 'An unexpected error occurred. Please try again or contact support.'
    : err.message;

  const details = config.app.isProduction ? undefined : { stack: err.stack };

  sendError(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    'INTERNAL_SERVER_ERROR',
    clientMessage,
    details,
  );
};
