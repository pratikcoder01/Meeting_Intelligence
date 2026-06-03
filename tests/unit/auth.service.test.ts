import {
  hashPassword,
  verifyPassword,
  generateTokenPair,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../src/services/auth.service';
import { UserRole } from '../../src/types';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';

describe('Auth Service Primitives', () => {
  const password = 'SecretPassword123!';
  const userId = '1234-abcd';
  const email = 'user@example.com';
  const role = UserRole.MEMBER;

  describe('Password Hashing', () => {
    it('should hash a password and verify it correctly', async () => {
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('wrong-password', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Tokens', () => {
    it('should generate a valid JWT access token with correct payload claims', () => {
      const token = signAccessToken(userId, email, role);
      expect(token).toBeDefined();

      const decoded = jwt.verify(token, config.jwt.secret) as any;
      expect(decoded.userId).toEqual(userId);
      expect(decoded.sub).toEqual(userId);
      expect(decoded.email).toEqual(email);
      expect(decoded.role).toEqual(role);
      expect(decoded.aud).toEqual(config.jwt.audience);
      expect(decoded.iss).toEqual(config.jwt.issuer);
    });

    it('should generate a valid JWT refresh token', () => {
      const token = signRefreshToken(userId, email, role);
      expect(token).toBeDefined();

      const decoded = jwt.verify(token, config.jwt.secret) as any;
      expect(decoded.userId).toEqual(userId);
    });

    it('should generate a token pair and verify the refresh token payload', () => {
      const pair = generateTokenPair(userId, email, role);
      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();
      expect(pair.expiresIn).toBeGreaterThan(0);

      const decodedPayload = verifyRefreshToken(pair.refreshToken);
      expect(decodedPayload.userId).toEqual(userId);
      expect(decodedPayload.email).toEqual(email);
      expect(decodedPayload.role).toEqual(role);
    });

    it('should throw an error for expired or invalid refresh tokens', () => {
      expect(() => verifyRefreshToken('invalid-token-string')).toThrow();
    });
  });
});
