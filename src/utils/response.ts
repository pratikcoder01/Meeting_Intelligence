import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

// ─── Response Shape Types ─────────────────────────────────────────────────────

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Send a standardised success response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options?: {
    statusCode?: number;
    message?: string;
    meta?: PaginationMeta;
  },
): void {
  const { statusCode = StatusCodes.OK, message, meta } = options ?? {};

  const body: SuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };

  res.status(statusCode).json(body);
}

/**
 * Send a standardised created (201) response.
 */
export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, { statusCode: StatusCodes.CREATED, message });
}

/**
 * Send a 204 No Content response (no body).
 */
export function sendNoContent(res: Response): void {
  res.status(StatusCodes.NO_CONTENT).end();
}

/**
 * Build paginated metadata from raw pagination params.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  perPage: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / perPage);
  return {
    total,
    page,
    perPage,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
