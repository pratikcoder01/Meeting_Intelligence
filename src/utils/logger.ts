import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '@/config';

// ─── Custom Log Levels ───────────────────────────────────────────────────────
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

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

// ─── Formats ─────────────────────────────────────────────────────────────────
const timestampFormat = winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' });

const jsonFormat = winston.format.combine(
  timestampFormat,
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  timestampFormat,
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n  ${JSON.stringify(meta, null, 2)}` : '';
    const stackStr = stack ? `\n${String(stack)}` : '';
    return `[${String(timestamp)}] ${level}: ${String(message)}${stackStr}${metaStr}`;
  }),
);

// ─── Transports ──────────────────────────────────────────────────────────────
const transports: winston.transport[] = [
  // Console — always enabled
  new winston.transports.Console({
    format: config.app.isProduction ? jsonFormat : consoleFormat,
  }),
];

if (config.app.isProduction) {
  // Rotating file transport for errors
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
    // Combined log
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

// ─── Logger Instance ─────────────────────────────────────────────────────────
export const logger = winston.createLogger({
  level: config.app.logLevel,
  levels,
  defaultMeta: { service: config.app.serviceName },
  transports,
  // Uncaught exceptions & unhandled rejections
  exceptionHandlers: [new winston.transports.Console({ format: consoleFormat })],
  rejectionHandlers: [new winston.transports.Console({ format: consoleFormat })],
  exitOnError: false,
});

/**
 * Create a child logger with additional default metadata.
 * Useful for per-request or per-module contextual logging.
 */
export const createChildLogger = (meta: Record<string, unknown>): winston.Logger =>
  logger.child(meta);
