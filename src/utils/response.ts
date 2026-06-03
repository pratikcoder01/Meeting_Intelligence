/**
 * response.ts
 *
 * Unified response helpers that enforce the envelope shape:
 *
 *   SUCCESS: { traceId, success: true,  data: T }
 *   ERROR:   { traceId, success: false, error: { code, message, details? } }
 *
 * traceId is read from the `res` object (set as the X-Trace-Id header by the
 * traceId middleware) so callers never have to pass it explicitly.
 *
 * Rule: ALL responses — including 4xx and 5xx — must go through one of these
 * helpers so the envelope contract is never broken.
 */

import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ApiSuccessResponse, ApiErrorResponse } from '@/types';

// ─── traceId extraction ───────────────────────────────────────────────────────
const getTraceIdFromRes = (res: Response): string =>
  (res.getHeader('X-Trace-Id') as string | undefined) ?? 'unknown';

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const buildPaginationMeta = (
  total: number,
  page: number,
  perPage: number,
): PaginationMeta => {
  const totalPages = Math.ceil(total / perPage);
  return {
    total,
    page,
    perPage,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

// ─── Success helpers ──────────────────────────────────────────────────────────

/**
 * Send a 200 OK success response.
 *
 * @example
 * sendSuccess(res, { user, accessToken });
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = StatusCodes.OK,
): void => {
  const body: ApiSuccessResponse<T> = {
    traceId: getTraceIdFromRes(res),
    success: true,
    data,
  };
  res.status(statusCode).json(body);
};

/**
 * Send a 201 Created success response.
 *
 * @example
 * sendCreated(res, { userId: user.id });
 */
export const sendCreated = <T>(res: Response, data: T): void =>
  sendSuccess(res, data, StatusCodes.CREATED);

/**
 * Send a 204 No Content response. No body is sent.
 */
export const sendNoContent = (res: Response): void => {
  res.status(StatusCodes.NO_CONTENT).end();
};

// ─── Error helpers ────────────────────────────────────────────────────────────

/**
 * Send a structured error response.
 * Use this from middleware and the global error handler — NOT from controllers
 * (controllers should throw AppError subclasses instead).
 *
 * @example
 * sendError(res, 401, 'UNAUTHORIZED', 'Token expired');
 */
export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): void => {
  const body: ApiErrorResponse = {
    traceId: getTraceIdFromRes(res),
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
  res.status(statusCode).json(body);
};
