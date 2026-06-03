import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { JwtPayload, UserRole, AuthenticatedRequest } from '@/types';
import { UnauthorizedError, ForbiddenError } from '@/utils/errors';

// ─── Token Extraction ─────────────────────────────────────────────────────────
const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
};

// ─── Verify JWT ───────────────────────────────────────────────────────────────
const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const payload = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as JwtPayload;
    return payload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid access token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
};

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Require a valid JWT access token. Attaches the decoded payload to `req.user`.
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractBearerToken(req);
  if (!token) {
    next(new UnauthorizedError('No authentication token provided'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optionally authenticate — attaches user if token is present, but does not
 * reject the request if there is no token.
 */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractBearerToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      (req as AuthenticatedRequest).user = payload;
    } catch {
      // Silently ignore invalid tokens for optional auth routes
    }
  }
  next();
};

/**
 * Require the authenticated user to have at least one of the specified roles.
 */
export const requireRole = (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    if (!roles.includes(authReq.user.role)) {
      next(
        new ForbiddenError(
          `Insufficient permissions. Required roles: ${roles.join(', ')}`,
        ),
      );
      return;
    }
    next();
  };

/**
 * Convenience alias — restrict to ADMIN role only.
 */
export const requireAdmin = requireRole(UserRole.ADMIN);
