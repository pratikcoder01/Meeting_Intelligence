/**
 * traceId.middleware.ts
 *
 * Responsibilities (in order):
 *  1. Read `X-Trace-Id` from the incoming request header (set by API gateways,
 *     load balancers, or upstream services for distributed tracing).
 *  2. If absent, generate a fresh UUID v4.
 *  3. Attach the traceId to `req.traceId` for typed access in controllers.
 *  4. Echo it back in `X-Trace-Id` response header so clients can correlate
 *     responses with their own logs.
 *  5. Wrap the rest of the request lifecycle in an AsyncLocalStorage context
 *     so every log call — even deep inside services — can read the traceId
 *     without it being passed as a parameter.
 *
 * IMPORTANT: This middleware MUST be the very first middleware registered in
 * app.ts so that the AsyncLocalStorage context is established before any
 * downstream code (including other middleware) runs.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncContext } from '@/utils/asyncContext';
import { TraceableRequest } from '@/types';

/** Header name used for distributed trace propagation. */
export const TRACE_HEADER = 'X-Trace-Id';

/**
 * Express middleware that establishes a per-request traceId and binds it to
 * the AsyncLocalStorage context for the duration of the request.
 */
export const traceIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Prefer upstream trace header; fall back to a fresh UUID.
  const rawHeader = req.headers[TRACE_HEADER.toLowerCase()] as string | undefined;
  const traceId = rawHeader && rawHeader.trim() !== '' ? rawHeader.trim() : uuidv4();

  // Expose on the request object for typed access in controllers / services.
  (req as TraceableRequest).traceId = traceId;

  // Echo in response headers so clients can correlate browser console errors
  // with server log entries.
  res.setHeader(TRACE_HEADER, traceId);

  // Wrap the rest of the async call chain in an AsyncLocalStorage context.
  // All code that runs synchronously or asynchronously from this point forward
  // (including callbacks, Promises, and event emitters) will be able to call
  // asyncContext.getStore() and receive { traceId }.
  asyncContext.run({ traceId }, () => {
    next();
  });
};
