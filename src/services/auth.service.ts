import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { JwtPayload, TokenPair, UserRole } from '@/types';
import { UnauthorizedError } from '@/utils/errors';

// ─── Password Hashing ─────────────────────────────────────────────────────────
export const hashPassword = async (plaintext: string): Promise<string> =>
  bcrypt.hash(plaintext, config.bcrypt.saltRounds);

export const verifyPassword = async (plaintext: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plaintext, hash);

// ─── Token Generation ─────────────────────────────────────────────────────────
const buildPayload = (userId: string, email: string, role: UserRole): JwtPayload => ({
  sub: userId,
  email,
  role,
});

export const signAccessToken = (userId: string, email: string, role: UserRole): string =>
  jwt.sign(buildPayload(userId, email, role), config.jwt.secret, {
    expiresIn: config.jwt.accessTokenExpiry,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  } as jwt.SignOptions);

export const signRefreshToken = (userId: string, email: string, role: UserRole): string =>
  jwt.sign(buildPayload(userId, email, role), config.jwt.secret, {
    expiresIn: config.jwt.refreshTokenExpiry,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  } as jwt.SignOptions);

export const generateTokenPair = (userId: string, email: string, role: UserRole): TokenPair => {
  const accessToken = signAccessToken(userId, email, role);
  const refreshToken = signRefreshToken(userId, email, role);

  // Decode to get actual expiry seconds (avoids parsing the string ourselves)
  const decoded = jwt.decode(accessToken) as JwtPayload;
  const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;

  return { accessToken, refreshToken, expiresIn };
};

// ─── Token Verification ───────────────────────────────────────────────────────
export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};
