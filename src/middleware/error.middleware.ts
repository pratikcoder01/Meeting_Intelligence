import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { config } from '@/config';
import { ErrorResponse } from '@/utils/response';
import { AuthenticatedRequest } from '@/types';

// ─── Global Error Handler ─────────────────────────────────────────────────────
/**
 * Express 4.x global error-handling middleware.
 * Must be registered AFTER all routes.
 */
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const requestId = (req as AuthenticatedRequest).requestId ?? 'unknown';

  // ── Operational Errors (expected, safe to expose to client) ──────────────
  if (err instanceof AppError && err.isOperational) {
    logger.warn('Operational error', {
      requestId,
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });

    const body: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
      requestId,
    };

    res.status(err.statusCode).json(body);
    return;
  }

  // ── Unexpected / Programming Errors ─────────────────────────────────────
  logger.error('Unexpected error', {
    requestId,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const body: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.app.isProduction
        ? 'An unexpected error occurred. Please try again later.'
        : err.message,
      ...(!config.app.isProduction && {
        details: { stack: err.stack },
      }),
    },
    requestId,
  };

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(body);
};

// ─── 404 Handler ─────────────────────────────────────────────────────────────
/**
 * Catch-all for routes that don't exist. Must be registered after all routes
 * but before the global error handler.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = (req as AuthenticatedRequest).requestId ?? 'unknown';

  const body: ErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    requestId,
  };

  res.status(StatusCodes.NOT_FOUND).json(body);
};
