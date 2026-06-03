/**
 * asyncContext.ts
 *
 * A module-level AsyncLocalStorage that carries per-request context
 * (currently just traceId) across the entire async call stack — including
 * Promises, setTimeout callbacks, and Prisma query hooks — without
 * passing context objects through every function signature.
 *
 * Usage:
 *   - The traceId middleware calls `asyncContext.run({ traceId }, next)`.
 *   - Any code downstream (logger, services, etc.) calls
 *     `asyncContext.getStore()?.traceId` to read the value.
 *
 * This is the Node.js-idiomatic alternative to thread-local storage and is
 * safe for concurrent requests because each call to `.run()` creates an
 * isolated continuation context.
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  /** UUID v4 that uniquely identifies the HTTP request end-to-end. */
  traceId: string;
}

export const asyncContext = new AsyncLocalStorage<RequestContext>();

/**
 * Read the traceId for the currently executing request.
 * Returns 'unknown' when called outside of a request context
 * (e.g., during startup or in background jobs).
 */
export const getTraceId = (): string => asyncContext.getStore()?.traceId ?? 'unknown';
