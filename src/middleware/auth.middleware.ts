/**
 * auth.middleware.ts
 *
 * JWT authentication middleware with three exports:
 *
 *  authenticate        — Requires a valid JWT. Returns 401 on any failure.
 *  optionalAuthenticate — Attaches user if token is present; silently skips otherwise.
 *  requireRole         — Guards a route to specific UserRole values.
 *
 * Token format expected:  Authorization: Bearer <jwt>
 *
 * On success, `req.user: JwtUserPayload` is attached with `{ userId, email, role }`.
 * On failure, the error response follows the unified envelope:
 *   { traceId, success: false, error: { code, message } }
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import {
  JwtTokenPayload,
  JwtUserPayload,
  UserRole,
  TraceableRequest,
  AuthenticatedRequest,
} from '@/types';
import { UnauthorizedError, ForbiddenError } from '@/utils/errors';
import { sendError } from '@/utils/response';
import { logger } from '@/utils/logger';

// ─── Token extraction ─────────────────────────────────────────────────────────

const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
};

// ─── JWT verification ─────────────────────────────────────────────────────────

/**
 * Verify and decode a JWT access token.
 * Throws a typed UnauthorizedError on any failure so the global error handler
 * formats it correctly.
 */
const verifyAccessToken = (token: string, traceId: string): JwtUserPayload => {
  let decoded: JwtTokenPayload;

  try {
    decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as unknown as JwtTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      logger.warn('JWT expired', { traceId, expiredAt: err.expiredAt });
      throw new UnauthorizedError('Access token has expired. Please refresh your session.');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      logger.warn('JWT invalid', { traceId, reason: err.message });
      throw new UnauthorizedError('Access token is invalid.');
    }
    // NotBeforeError or any other jwt error
    throw new UnauthorizedError('Token verification failed.');
  }

  // Validate that the payload contains all required fields.
  if (!decoded.userId || !decoded.email || !decoded.role) {
    logger.warn('JWT payload missing required fields', { traceId, payload: decoded });
    throw new UnauthorizedError('Access token has an invalid structure.');
  }

  return {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  };
};

// ─── Middleware ────────────────────────────────────────────────────────────────

/**
 * Require a valid JWT Bearer token.
 *
 * On success: attaches `req.user: JwtUserPayload` and calls next().
 * On failure: responds immediately with:
 *   HTTP 401  { traceId, success: false, error: { code: 'UNAUTHORIZED', message } }
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const traceableReq = req as TraceableRequest;
  const traceId = traceableReq.traceId ?? 'unknown';

  const token = extractBearerToken(req);
  if (!token) {
    sendError(res, 401, 'UNAUTHORIZED', 'No Bearer token provided in the Authorization header.');
    return;
  }

  try {
    const userPayload = verifyAccessToken(token, traceId);
    (req as AuthenticatedRequest).user = userPayload;
    next();
  } catch (err) {
    // UnauthorizedError is an AppError subclass — pass to the global error handler
    // so it uses the unified format (which also injects traceId).
    next(err);
  }
};

/**
 * Optionally authenticate — attaches `req.user` if a valid token is present,
 * but does NOT reject the request if the token is missing or invalid.
 * Useful for routes that serve both authenticated and anonymous users.
 */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractBearerToken(req);
  if (token) {
    try {
      const userPayload = verifyAccessToken(token, (req as TraceableRequest).traceId);
      (req as AuthenticatedRequest).user = userPayload;
    } catch {
      // Silently ignore — optional auth does not block the request.
    }
  }
  next();
};

/**
 * Require the authenticated user to have at least one of the listed roles.
 * Must be used AFTER `authenticate`.
 *
 * @example
 * router.delete('/admin/users/:id', authenticate, requireRole(UserRole.ADMIN), handler);
 */
export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(authReq.user.role)) {
      next(
        new ForbiddenError(`This action requires one of the following roles: ${roles.join(', ')}`),
      );
      return;
    }

    next();
  };

/** Convenience — restrict route to ADMIN role only. */
export const requireAdmin = requireRole(UserRole.ADMIN);
