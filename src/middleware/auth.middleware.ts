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
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '@/config';
import {
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

import { prisma } from '@/services/database.service';

const getJwtSecret = (): string => {
  return process.env.SUPABASE_JWT_SECRET || config.jwt.secret;
};

// Cache JWKS set instance
let jwksInstance: ReturnType<typeof createRemoteJWKSet> | null = null;

const getJWKS = (): ReturnType<typeof createRemoteJWKSet> | null => {
  if (jwksInstance) return jwksInstance;

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) return null;

  const jwksUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
  jwksInstance = createRemoteJWKSet(new URL(jwksUrl));
  return jwksInstance;
};

// ─── JWT verification ─────────────────────────────────────────────────────────

/**
 * Verify and decode a Supabase JWT access token using either JWKS (ES256) or Local Secret (HS256).
 */
const verifyAccessToken = async (token: string, traceId: string): Promise<JwtUserPayload> => {
  let decoded: any;

  try {
    const JWKS = getJWKS();
    if (JWKS) {
      try {
        // Try verifying with JWKS (asymmetric ES256) first
        const { payload } = await jwtVerify(token, JWKS, {
          algorithms: ['ES256'],
        });
        decoded = payload;
      } catch (jwksErr: any) {
        // If the token is not ES256 or JWKS fails, fall back to symmetric HS256 validation
        logger.debug('JWKS verification skipped or failed, falling back to local secret verify', {
          traceId,
          error: jwksErr.message,
        });
        const secret = getJwtSecret();
        decoded = jwt.verify(token, secret) as any;
      }
    } else {
      const secret = getJwtSecret();
      decoded = jwt.verify(token, secret) as any;
    }
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError || (err as any).code === 'ERR_JWT_EXPIRED') {
      logger.warn('JWT expired', { traceId });
      throw new UnauthorizedError('Access token has expired. Please refresh your session.');
    }
    logger.warn('JWT invalid', { traceId, reason: (err as any).message });
    throw new UnauthorizedError('Access token is invalid.');
  }

  const userId = decoded.sub;
  const email = decoded.email;

  if (!userId || !email) {
    logger.warn('JWT payload missing sub or email', { traceId, payload: decoded });
    throw new UnauthorizedError('Access token has an invalid structure.');
  }

  return {
    userId,
    email,
    role: UserRole.MEMBER,
  };
};

// ─── Middleware ────────────────────────────────────────────────────────────────

/**
 * Require a valid JWT Bearer token.
 * Automatically synchronizes Supabase users with the public.users database profiles.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const traceableReq = req as TraceableRequest;
  const traceId = traceableReq.traceId ?? 'unknown';

  const token = extractBearerToken(req);
  if (!token) {
    sendError(res, 401, 'UNAUTHORIZED', 'No Bearer token provided in the Authorization header.');
    return;
  }

  try {
    const userPayload = await verifyAccessToken(token, traceId);
    
    // Check if the user exists in public.users database
    let user = await prisma.user.findUnique({
      where: { id: userPayload.userId },
    });

    if (!user) {
      const jwtDecoded = jwt.decode(token) as any;
      const name = jwtDecoded?.user_metadata?.name || 'User';

      user = await prisma.user.create({
        data: {
          id: userPayload.userId,
          email: userPayload.email,
          name,
        },
      });
      logger.info('Dynamically synchronized user profile from Supabase Auth token to database', {
        userId: user.id,
        email: user.email,
        traceId,
      });
    }

    (req as AuthenticatedRequest).user = userPayload;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optionally authenticate — attaches req.user if a valid token is present and synced.
 */
export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const token = extractBearerToken(req);
  if (token) {
    try {
      const userPayload = await verifyAccessToken(token, (req as TraceableRequest).traceId);
      
      let user = await prisma.user.findUnique({
        where: { id: userPayload.userId },
      });

      if (!user) {
        const jwtDecoded = jwt.decode(token) as any;
        const name = jwtDecoded?.user_metadata?.name || 'User';
        await prisma.user.create({
          data: {
            id: userPayload.userId,
            email: userPayload.email,
            name,
          },
        });
      }

      (req as AuthenticatedRequest).user = userPayload;
    } catch {
      // Ignore
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
