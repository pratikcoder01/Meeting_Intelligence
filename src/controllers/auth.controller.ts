import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { generateTokenPair, hashPassword, verifyPassword, verifyRefreshToken } from '@/services';
import { sendSuccess, sendCreated } from '@/utils/response';
import { BadRequestError, UnauthorizedError } from '@/utils/errors';
import { UserRole } from '@/types';
import { generateId } from '@/utils/helpers';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ─── Temporary In-Memory User Store ──────────────────────────────────────────
// Replace with Prisma user repository calls.
interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}
const userStore = new Map<string, StoredUser>();

// ─── Controller ───────────────────────────────────────────────────────────────
export class AuthController {
  /**
   * POST /auth/register
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as z.infer<typeof RegisterSchema>;

      const existingUser = Array.from(userStore.values()).find((u) => u.email === body.email);
      if (existingUser) {
        throw new BadRequestError('An account with this email already exists');
      }

      const passwordHash = await hashPassword(body.password);
      const user: StoredUser = {
        id: generateId(),
        name: body.name,
        email: body.email,
        passwordHash,
        role: UserRole.MEMBER,
      };
      userStore.set(user.id, user);

      const tokens = generateTokenPair(user.id, user.email, user.role);

      sendCreated(res, {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        ...tokens,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body as z.infer<typeof LoginSchema>;

      const user = Array.from(userStore.values()).find((u) => u.email === email);
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const tokens = generateTokenPair(user.id, user.email, user.role);

      sendSuccess(res, {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        ...tokens,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /auth/refresh
   */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as z.infer<typeof RefreshTokenSchema>;
      const payload = verifyRefreshToken(refreshToken);

      const user = userStore.get(payload.sub);
      if (!user) {
        throw new UnauthorizedError('User no longer exists');
      }

      const tokens = generateTokenPair(user.id, user.email, user.role);
      sendSuccess(res, tokens);
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
