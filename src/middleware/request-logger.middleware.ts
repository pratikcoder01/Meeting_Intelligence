/**
 * httpLogger.middleware.ts
 *
 * Structured HTTP request/response logger built on top of Winston.
 *
 * Unlike Morgan (which is a string-based HTTP logger), this middleware produces
 * fully structured JSON log entries that include:
 *   - traceId  (from AsyncLocalStorage — automatically present)
 *   - method, path, status, duration
 *   - userAgent, ip
 *   - userId (when the request is authenticated)
 *
 * The log entry is emitted in the `finish` event of the response so that
 * the final HTTP status code is always captured (even after error handlers
 * modify the status).
 *
 * Skips health/readiness endpoints to avoid noise in log aggregators.
 */

import { Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { TraceableRequest, AuthenticatedRequest } from '@/types';

const SKIP_PATHS = new Set(['/health', '/ready']);

export const httpLogger = (req: TraceableRequest, res: Response, next: NextFunction): void => {
  // Skip liveness/readiness probes from generating log noise.
  if (SKIP_PATHS.has(req.path)) {
    next();
    return;
  }

  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'http';

    logger.log(level, 'HTTP request completed', {
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length ? req.query : undefined,
      status,
      durationMs,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      // userId is present only after the auth middleware has run.
      userId: (req as AuthenticatedRequest).user?.userId ?? undefined,
    });
  });

  next();
};
