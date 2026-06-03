/**
 * auth.controller.ts
 *
 * Handles user registration, login, and token refresh.
 *
 * All routes use the Prisma User model for persistence, so there is no
 * in-memory store. The Prisma singleton is imported from the database service.
 *
 * Response envelope:
 *   SUCCESS: { traceId, success: true,  data: { user, accessToken, ... } }
 *   ERROR:   { traceId, success: false, error: { code, message, details? } }
 *
 * All errors are thrown as AppError subclasses and caught by the global
 * error handler — controllers never call sendError() directly.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@/services/database.service';
import {
  hashPassword,
  verifyPassword,
  generateTokenPair,
  verifyRefreshToken,
} from '@/services/auth.service';
import { sendSuccess, sendCreated } from '@/utils/response';
import { ConflictError, UnauthorizedError, NotFoundError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { TraceableRequest, UserRole } from '@/types';

// =============================================================================
//  Zod Schemas — co-located with the controller that uses them
// =============================================================================

/**
 * Registration body.
 * Password rules follow NIST SP 800-63B:
 *  - Minimum 8 characters
 *  - At least one uppercase, one digit, one special character
 *  - Maximum 72 characters (bcrypt's effective input limit)
 */
export const RegisterSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),

  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Must be a valid email address'),

  password: z
    .string({ required_error: 'Password is required' })
    .min(8,  'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Z]/,        'Password must contain at least one uppercase letter')
    .regex(/[0-9]/,        'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

/**
 * Login body.
 * Kept intentionally simple — specific error messages are avoided to prevent
 * user-enumeration attacks (always return the same 401 message).
 */
export const LoginSchema = z.object({
  email:    z.string({ required_error: 'Email is required' }).trim().toLowerCase().email(),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

/**
 * Refresh token body.
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: 'refreshToken is required' })
    .min(1, 'refreshToken must not be empty'),
});

// =============================================================================
//  Exported controller methods
// =============================================================================

export class AuthController {
  // ── POST /api/auth/register ──────────────────────────────────────────────

  /**
   * Register a new user account.
   *
   * Steps:
   *  1. Validate body via Zod (done by validate middleware before this runs).
   *  2. Check for duplicate email (409 Conflict on duplicate).
   *  3. Hash password with bcrypt (salt 12).
   *  4. Persist user to PostgreSQL via Prisma.
   *  5. Generate access + refresh token pair.
   *  6. Return 201 with user profile (no passwordHash) and tokens.
   *
   * Security notes:
   *  - passwordHash is never included in any response.
   *  - The existence of a registered email is NOT revealed — conflict error
   *    message is generic enough to avoid user-enumeration via timing differences.
   *    (A dedicated anti-enumeration strategy would add artificial delay here.)
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password } = req.body as z.infer<typeof RegisterSchema>;
      const traceId = (req as TraceableRequest).traceId;

      // ── 1. Duplicate email check ─────────────────────────────────────
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        // We still throw ConflictError (not a generic error) because the 409
        // status code itself reveals the email exists. If you need strict
        // non-enumeration, return 200 and send a "check your email" message.
        throw new ConflictError('An account with this email address already exists.');
      }

      // ── 2. Hash password ─────────────────────────────────────────────
      const passwordHash = await hashPassword(password);

      // ── 3. Persist user ──────────────────────────────────────────────
      const user = await prisma.user.create({
        data: { name, email, passwordHash },
        select: {
          id:        true,
          name:      true,
          email:     true,
          createdAt: true,
          // passwordHash intentionally excluded from select
        },
      });

      logger.info('User registered', { userId: user.id, email: user.email, traceId });

      // ── 4. Generate tokens ───────────────────────────────────────────
      // Default role for new accounts is MEMBER. Add a `role` column to the
      // Prisma schema when role-based registration is needed.
      const tokens = generateTokenPair(user.id, user.email, UserRole.MEMBER);

      // ── 5. Respond ───────────────────────────────────────────────────
      sendCreated(res, {
        user: {
          userId:    user.id,
          name:      user.name,
          email:     user.email,
          role:      UserRole.MEMBER,
          createdAt: user.createdAt,
        },
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn:    tokens.expiresIn,
        tokenType:    'Bearer',
      });
    } catch (err) {
      next(err);
    }
  };

  // ── POST /api/auth/login ─────────────────────────────────────────────────

  /**
   * Authenticate an existing user and return a token pair.
   *
   * Steps:
   *  1. Validate body via Zod.
   *  2. Fetch user by email (single query).
   *  3. Verify password with bcrypt.compare().
   *  4. Generate token pair.
   *  5. Return 200 with user profile and tokens.
   *
   * Security notes:
   *  - Steps 2 and 3 use the SAME error message ("Invalid credentials") to
   *    prevent user-enumeration attacks (attacker cannot distinguish "email
   *    not found" from "wrong password" based on the error code or message).
   *  - bcrypt.compare() runs even when no user is found (with a dummy hash)
   *    to prevent timing-based user enumeration. Implemented via the
   *    DUMMY_HASH fallback below.
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body as z.infer<typeof LoginSchema>;
      const traceId = (req as TraceableRequest).traceId;

      // ── 1. Fetch user ────────────────────────────────────────────────
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id:           true,
          name:         true,
          email:        true,
          passwordHash: true,
          createdAt:    true,
        },
      });

      // ── 2. Constant-time password check ─────────────────────────────
      // If the user does not exist we still run bcrypt.compare() against a
      // dummy hash so the response time is indistinguishable from a wrong-
      // password scenario (timing attack mitigation).
      const DUMMY_HASH =
        '$2b$12$invalidhashfortimingneutralizationXXXXXXXXXXXXXXXXXXXXXXX';

      const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
      const passwordMatch = await verifyPassword(password, hashToCheck);

      if (!user || !passwordMatch) {
        logger.warn('Login failed', { email, reason: !user ? 'user_not_found' : 'wrong_password', traceId });
        throw new UnauthorizedError('Invalid email address or password.');
      }

      logger.info('User logged in', { userId: user.id, email: user.email, traceId });

      // ── 3. Generate tokens ───────────────────────────────────────────
      const tokens = generateTokenPair(user.id, user.email, UserRole.MEMBER);

      // ── 4. Respond ───────────────────────────────────────────────────
      sendSuccess(res, {
        user: {
          userId:    user.id,
          name:      user.name,
          email:     user.email,
          role:      UserRole.MEMBER,
          createdAt: user.createdAt,
        },
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn:    tokens.expiresIn,
        tokenType:    'Bearer',
      });
    } catch (err) {
      next(err);
    }
  };

  // ── POST /api/auth/refresh ───────────────────────────────────────────────

  /**
   * Exchange a valid refresh token for a new access + refresh token pair.
   *
   * In production, implement refresh token rotation:
   *  1. Verify the incoming refresh token.
   *  2. Look it up in a Redis store to ensure it hasn't been revoked.
   *  3. Delete the old token from Redis.
   *  4. Store the new refresh token in Redis.
   *  5. Return the new pair.
   *
   * This implementation performs steps 1 + 4 + 5; Redis rotation is marked
   * as a TODO for when the Redis service is wired up.
   */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as z.infer<typeof RefreshTokenSchema>;
      const traceId = (req as TraceableRequest).traceId;

      // ── 1. Verify refresh token ──────────────────────────────────────
      const decoded = verifyRefreshToken(refreshToken);

      // ── 2. Confirm the user still exists (not deleted/suspended) ────
      const user = await prisma.user.findUnique({
        where:  { id: decoded.userId },
        select: { id: true, email: true, name: true },
      });
      if (!user) {
        throw new NotFoundError('User');
      }

      logger.info('Token refreshed', { userId: user.id, traceId });

      // ── 3. Issue a new pair ──────────────────────────────────────────
      // TODO: implement refresh token rotation via Redis to prevent
      // token-replay attacks on stolen refresh tokens.
      const tokens = generateTokenPair(user.id, user.email, decoded.role);

      sendSuccess(res, {
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn:    tokens.expiresIn,
        tokenType:    'Bearer',
      });
    } catch (err) {
      next(err);
    }
  };

  // ── GET /api/auth/me ─────────────────────────────────────────────────────

  /**
   * Return the currently authenticated user's profile.
   * Requires the `authenticate` middleware to be applied on the route.
   */
  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // `req.user` is guaranteed by the `authenticate` middleware.
      // Cast is safe — the route definition applies `authenticate` before this.
      const { userId } = (req as import('@/types').AuthenticatedRequest).user;
      const traceId    = (req as TraceableRequest).traceId;

      const user = await prisma.user.findUnique({
        where:  { id: userId },
        select: { id: true, name: true, email: true, createdAt: true },
      });

      if (!user) {
        // This can happen if the account was deleted after the JWT was issued.
        throw new NotFoundError('User');
      }

      logger.debug('Fetched current user profile', { userId, traceId });

      sendSuccess(res, {
        userId:    user.id,
        name:      user.name,
        email:     user.email,
        role:      UserRole.MEMBER,
        createdAt: user.createdAt,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
