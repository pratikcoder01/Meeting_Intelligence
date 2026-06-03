/**
 * app.ts — Express application factory.
 *
 * Middleware registration ORDER matters. The sequence is:
 *  1. traceIdMiddleware  — MUST be first; establishes AsyncLocalStorage context.
 *  2. Security (Helmet, CORS)
 *  3. Body parsing + Compression
 *  4. httpLogger           — reads traceId from AsyncLocalStorage
 *  5. Rate limiters
 *  6. Routes
 *  7. notFoundHandler      — 404 catch-all
 *  8. globalErrorHandler   — terminal error formatter (must be LAST)
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import {
  traceIdMiddleware,
  httpLogger,
  globalErrorHandler,
  notFoundHandler,
} from '@/middleware';
import { apiRouter } from '@/routes';
import { getTraceId } from '@/utils';

// ─── Rate-limit error body factory ───────────────────────────────────────────
// express-rate-limit calls this function when a client is throttled.
// We override the default text/plain body with our unified JSON envelope.
// `getTraceId()` reads from AsyncLocalStorage — because traceIdMiddleware runs
// before the rate limiter, the context is already set.

const rateLimitMessage = (_req: Request, res: Response): void => {
  res.status(429).json({
    traceId: getTraceId(),
    success: false,
    error: {
      code:    'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Please try again later.',
    },
  });
};

const authRateLimitMessage = (_req: Request, res: Response): void => {
  res.status(429).json({
    traceId: getTraceId(),
    success: false,
    error: {
      code:    'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  });
};

// =============================================================================
//  Application Factory
// =============================================================================

export const createApp = (): Application => {
  const app = express();

  // ── Trust proxy ──────────────────────────────────────────────────────────
  // Required when running behind nginx, an AWS ALB, or any reverse proxy so
  // that req.ip reflects the real client IP (not the proxy's IP).
  if (config.app.isProduction) {
    app.set('trust proxy', 1);
  }

  // ── 1. traceId — must be absolute first ──────────────────────────────────
  app.use(traceIdMiddleware);

  // ── 2. Security headers ──────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy:    config.app.isProduction,
      crossOriginEmbedderPolicy: config.app.isProduction,
    }),
  );
  app.use(cors(config.cors));

  // ── 3. Body parsing + Compression ────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(compression());

  // ── 4. HTTP request logger ───────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use(httpLogger as any);

  // ── 5. Rate limiters ─────────────────────────────────────────────────────
  // Global: 100 requests per 15 minutes per IP
  app.use(
    rateLimit({
      windowMs:        config.rateLimit.windowMs,
      max:             config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders:   false,
      message:         rateLimitMessage,
    }),
  );

  // Auth routes: 10 requests per 15 minutes per IP (brute-force protection)
  app.use(
    `/api/${config.app.apiVersion}/auth`,
    rateLimit({
      windowMs:        15 * 60 * 1000,
      max:             10,
      standardHeaders: true,
      legacyHeaders:   false,
      message:         authRateLimitMessage,
    }),
  );

  // ── 6. Routes ────────────────────────────────────────────────────────────
  app.use('/', apiRouter);

  // ── 7. 404 catch-all ─────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── 8. Global error handler (must be last) ───────────────────────────────
  app.use(globalErrorHandler);

  return app;
};
