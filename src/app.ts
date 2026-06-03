import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import { requestId, httpLogger, globalErrorHandler, notFoundHandler } from '@/middleware';
import { apiRouter } from '@/routes';

// ─── Application Factory ──────────────────────────────────────────────────────

export const createApp = (): Application => {
  const app = express();

  // ── Trust Proxy (required when behind nginx / load balancer) ────────────
  if (config.app.isProduction) {
    app.set('trust proxy', 1);
  }

  // ── Security Headers ─────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: config.app.isProduction,
      crossOriginEmbedderPolicy: config.app.isProduction,
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.use(cors(config.cors));

  // ── Body Parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Compression ──────────────────────────────────────────────────────────
  app.use(compression());

  // ── Request ID & HTTP Logging ─────────────────────────────────────────────
  app.use(requestId);
  app.use(httpLogger);

  // ── Global Rate Limiting ──────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP, please try again later.',
      },
    },
  });
  app.use(globalLimiter);

  // ── Auth Endpoints — Stricter Rate Limit ─────────────────────────────────
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many authentication attempts, please try again in 15 minutes.',
      },
    },
  });
  app.use(`/api/${config.app.apiVersion}/auth`, authLimiter);

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/', apiRouter);

  // ── 404 Handler (must come after routes) ─────────────────────────────────
  app.use(notFoundHandler);

  // ── Global Error Handler (must be last) ──────────────────────────────────
  app.use(globalErrorHandler);

  return app;
};
