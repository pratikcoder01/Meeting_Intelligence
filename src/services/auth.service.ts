/**
 * auth.service.ts
 *
 * Low-level auth primitives used by the AuthController:
 *  - Password hashing / verification via bcrypt (cost factor 12)
 *  - JWT access + refresh token signing and verification
 *
 * These functions are intentionally free of Express types so they can be
 * tested independently and reused in CLI scripts or background jobs.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { JwtTokenPayload, JwtUserPayload, TokenPair, UserRole } from '@/types';
import { UnauthorizedError } from '@/utils/errors';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * bcrypt cost factor.
 * 12 rounds ≈ 250ms on modern hardware — well above the OWASP minimum of 10
 * and comfortable for login frequency without requiring bcrypt-specific
 * hardware.
 */
const BCRYPT_SALT_ROUNDS = config.bcrypt.saltRounds; // validated to be 10–15 in config

// ─── Password helpers ─────────────────────────────────────────────────────────

/**
 * Hash a plaintext password with bcrypt.
 * Always use this instead of bcrypt.hash() directly to keep the salt rounds
 * configuration centralised and consistent.
 */
export const hashPassword = async (plaintext: string): Promise<string> =>
  bcrypt.hash(plaintext, BCRYPT_SALT_ROUNDS);

/**
 * Verify a plaintext password against a stored bcrypt hash.
 * Returns `false` (never throws) on mismatch so callers can decide whether
 * to throw an error or log an audit event.
 */
export const verifyPassword = async (plaintext: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plaintext, hash);

// ─── JWT helpers ──────────────────────────────────────────────────────────────

/** Shared JWT signing options derived from typed config. */
const baseSignOptions = (): jwt.SignOptions => ({
  issuer:   config.jwt.issuer,
  audience: config.jwt.audience,
});

/**
 * Build a standard JWT payload from user fields.
 * Includes `sub` (JWT standard) AND `userId` (explicit) pointing to the same
 * value so downstream code never needs to rename fields.
 */
const buildTokenPayload = (
  userId: string,
  email: string,
  role: UserRole,
): Omit<JwtTokenPayload, 'iat' | 'exp' | 'iss' | 'aud'> => ({
  sub:    userId,
  userId,
  email,
  role,
});

/**
 * Sign a short-lived access token.
 * Default expiry: 15 minutes (configurable via JWT_ACCESS_TOKEN_EXPIRY).
 */
export const signAccessToken = (userId: string, email: string, role: UserRole): string =>
  jwt.sign(buildTokenPayload(userId, email, role), config.jwt.secret, {
    ...baseSignOptions(),
    expiresIn: config.jwt.accessTokenExpiry,
  } as jwt.SignOptions);

/**
 * Sign a long-lived refresh token.
 * Default expiry: 7 days (configurable via JWT_REFRESH_TOKEN_EXPIRY).
 *
 * Refresh tokens should be stored in an HttpOnly cookie or a server-side
 * store (e.g., Redis) in production to prevent XSS theft.
 */
export const signRefreshToken = (userId: string, email: string, role: UserRole): string =>
  jwt.sign(buildTokenPayload(userId, email, role), config.jwt.secret, {
    ...baseSignOptions(),
    expiresIn: config.jwt.refreshTokenExpiry,
  } as jwt.SignOptions);

/**
 * Generate a matched access + refresh token pair.
 * Returns `expiresIn` in seconds so clients can schedule silent refresh.
 */
export const generateTokenPair = (userId: string, email: string, role: UserRole): TokenPair => {
  const accessToken  = signAccessToken(userId, email, role);
  const refreshToken = signRefreshToken(userId, email, role);

  // Decode (no verify needed — we just signed it) to read `exp`.
  const decoded  = jwt.decode(accessToken) as JwtTokenPayload;
  const expiresIn = decoded.exp
    ? decoded.exp - Math.floor(Date.now() / 1000)
    : 900; // fallback: 15 minutes

  return { accessToken, refreshToken, expiresIn };
};

/**
 * Verify a refresh token and return the decoded user payload.
 * Throws UnauthorizedError on expiry or invalid signature.
 */
export const verifyRefreshToken = (token: string): JwtUserPayload => {
  let decoded: JwtTokenPayload;

  try {
    decoded = jwt.verify(token, config.jwt.secret, {
      issuer:   config.jwt.issuer,
      audience: config.jwt.audience as string,
    }) as unknown as JwtTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token has expired. Please log in again.');
    }
    throw new UnauthorizedError('Invalid refresh token.');
  }

  if (!decoded.userId || !decoded.email || !decoded.role) {
    throw new UnauthorizedError('Refresh token payload is malformed.');
  }

  return { userId: decoded.userId, email: decoded.email, role: decoded.role };
};
