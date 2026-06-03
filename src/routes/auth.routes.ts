import { Router } from 'express';
import { authController, RegisterSchema, LoginSchema, RefreshTokenSchema } from '@/controllers';
import { validate } from '@/middleware';

const router = Router();

/**
 * @route  POST /api/v1/auth/register
 * @desc   Register a new user account
 * @access Public
 */
router.post('/register', validate(RegisterSchema), authController.register);

/**
 * @route  POST /api/v1/auth/login
 * @desc   Authenticate a user and return tokens
 * @access Public
 */
router.post('/login', validate(LoginSchema), authController.login);

/**
 * @route  POST /api/v1/auth/refresh
 * @desc   Exchange a refresh token for a new token pair
 * @access Public
 */
router.post('/refresh', validate(RefreshTokenSchema), authController.refresh);

export { router as authRouter };
