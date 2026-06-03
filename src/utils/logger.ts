/**
 * logger.ts
 *
 * Production-grade Winston logger with the following properties:
 *
 * 1. traceId — reads from AsyncLocalStorage on every log call so it is
 *    always present without being passed as a parameter.
 * 2. Structured JSON in production — machine-parseable by log aggregators
 *    (Datadog, Loki, CloudWatch).
 * 3. Colorized, human-readable format in development.
 * 4. Rotating file transports in production (error + combined).
 * 5. Child logger factory for per-module default metadata.
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '@/config';
import { getTraceId } from '@/utils/asyncContext';

// ─── Custom log levels (extends Winston defaults) ─────────────────────────────
const levels = { error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6 };
const levelColors: Record<string, string> = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey',
};
winston.addColors(levelColors);

// ─── traceId injector ─────────────────────────────────────────────────────────
/**
 * A custom Winston format that reads the current traceId from
 * AsyncLocalStorage and splices it into every log entry.
 * Because this runs at log-call time (not at logger-creation time),
 * it always reflects the correct request context.
 */
const injectTraceId = winston.format((info) => {
  info['traceId'] = getTraceId();
  return info;
});

// ─── Formats ──────────────────────────────────────────────────────────────────
const timestampFmt = winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' });

/** Structured JSON format — used in production and file transports. */
const jsonFormat = winston.format.combine(
  timestampFmt,
  injectTraceId(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/** Human-readable colorized format — used in development console. */
const prettyFormat = winston.format.combine(
  timestampFmt,
  injectTraceId(),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, traceId, stack, ...meta } = info;
    const tid = traceId ? ` [${String(traceId)}]` : '';
    const metaStr = Object.keys(meta).length ? `\n  ${JSON.stringify(meta, null, 2)}` : '';
    const stackStr = stack ? `\n${String(stack)}` : '';
    return `${String(timestamp)} ${level}${tid}: ${String(message)}${stackStr}${metaStr}`;
  }),
);

// ─── Transports ───────────────────────────────────────────────────────────────
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: config.app.isProduction ? jsonFormat : prettyFormat,
  }),
];

if (config.app.isProduction) {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '20m',
      zippedArchive: true,
      format: jsonFormat,
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '50m',
      zippedArchive: true,
      format: jsonFormat,
    }),
  );
}

// ─── Logger instance ──────────────────────────────────────────────────────────
export const logger = winston.createLogger({
  level: config.app.logLevel,
  levels,
  defaultMeta: { service: config.app.serviceName },
  transports,
  exceptionHandlers: [new winston.transports.Console({ format: prettyFormat })],
  rejectionHandlers: [new winston.transports.Console({ format: prettyFormat })],
  exitOnError: false,
});

/**
 * Create a child logger that permanently carries extra metadata fields
 * (e.g., module name, userId) on every log entry it produces.
 *
 * @example
 * const log = createChildLogger({ module: 'AuthController' });
 * log.info('User registered', { userId });
 */
export const createChildLogger = (meta: Record<string, unknown>): winston.Logger =>
  logger.child(meta);
