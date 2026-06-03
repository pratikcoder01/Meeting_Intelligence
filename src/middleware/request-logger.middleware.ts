import { Request, Response, NextFunction } from 'express';
import type { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';
import morgan from 'morgan';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/types';

// ─── Request ID Middleware ────────────────────────────────────────────────────
/**
 * Attaches a unique request ID to every incoming request.
 * Reads from X-Request-Id header if provided by an upstream proxy,
 * otherwise generates a new UUID v4.
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = (req.headers['x-request-id'] as string | undefined) ?? uuidv4();
  (req as AuthenticatedRequest).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};

// ─── Morgan HTTP Logger ───────────────────────────────────────────────────────
/**
 * HTTP request logger using Morgan, piped into Winston.
 * Logs request method, path, status, response time, and request ID.
 */
morgan.token('request-id', (req: Request) => (req as AuthenticatedRequest).requestId ?? '-');
morgan.token('user-id', (req: Request) => (req as AuthenticatedRequest).user?.sub ?? 'anonymous');

const morganFormat =
  ':method :url :status :res[content-length] bytes - :response-time ms | req-id=:request-id user=:user-id';

export const httpLogger = morgan(morganFormat, {
  stream: {
    write: (message: string) => {
      logger.http(message.trim());
    },
  },
  // Skip health-check endpoints to avoid log noise
  skip: (req: IncomingMessage) => {
    const expressReq = req as unknown as Request;
    return expressReq.path === '/health' || expressReq.path === '/ready';
  },
});
