/**
 * auth.routes.ts
 *
 * Public auth endpoints — no JWT required.
 * Each route applies the validate() middleware so bodies are Zod-parsed
 * before the controller method runs.
 *
 * Rate limiting is applied at the app level (authLimiter) for all /auth routes.
 */

import { Router } from 'express';
import {
  authController,
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
} from '@/controllers';
import { validate, authenticate } from '@/middleware';

const router = Router();

/**
 * @route  POST /api/auth/register
 * @desc   Create a new user account; returns a JWT token pair on success.
 * @access Public
 * @body   { name: string, email: string, password: string }
 */
router.post('/register', validate(RegisterSchema), authController.register);

/**
 * @route  POST /api/auth/login
 * @desc   Authenticate with email/password; returns a JWT token pair.
 * @access Public
 * @body   { email: string, password: string }
 */
router.post('/login', validate(LoginSchema), authController.login);

/**
 * @route  POST /api/auth/refresh
 * @desc   Exchange a valid refresh token for a new access + refresh token pair.
 * @access Public
 * @body   { refreshToken: string }
 */
router.post('/refresh', validate(RefreshTokenSchema), authController.refresh);

/**
 * @route  GET /api/auth/me
 * @desc   Return the profile of the currently authenticated user.
 * @access Private — requires Authorization: Bearer <token>
 */
router.get('/me', authenticate, authController.me);

export { router as authRouter };
