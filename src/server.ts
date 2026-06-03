/**
 * server.ts — Entry point for the Meeting Intelligence Service.
 *
 * Responsibilities:
 *  1. Import config early so env vars are validated before anything else.
 *  2. Create the Express app.
 *  3. Connect to the database.
 *  4. Start listening.
 *  5. Handle graceful shutdown (SIGTERM / SIGINT).
 */

import { config } from '@/config';
import { logger } from '@/utils/logger';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from '@/services';
import http from 'http';

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const bootstrap = async (): Promise<void> => {
  // Connect to the database
  await connectDatabase();

  // Create the Express application
  const app = createApp();

  // Create raw http.Server so we can manage it during graceful shutdown
  const server = http.createServer(app);

  // Start listening
  server.listen(config.app.port, () => {
    logger.info(`🚀 ${config.app.serviceName} is running`, {
      port: config.app.port,
      environment: config.app.env,
      apiBase: `/api/${config.app.apiVersion}`,
      pid: process.pid,
    });
  });

  // ── Graceful Shutdown ──────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal} — initiating graceful shutdown`);

    // Force exit after 30 seconds if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30_000).unref();

    // Stop accepting new connections
    await new Promise<void>((resolve) => {
      server.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    });

    try {
      await disconnectDatabase();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { err });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

// ─── Unhandled Errors ─────────────────────────────────────────────────────────
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception — shutting down', {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection — shutting down', { reason });
  process.exit(1);
});

// ─── Run ─────────────────────────────────────────────────────────────────────
bootstrap().catch((err: unknown) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});
