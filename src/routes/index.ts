import { Router, Request, Response } from 'express';
import { config } from '@/config';
import { authRouter } from './auth.routes';
import { meetingRouter } from './meeting.routes';
import { actionItemRouter } from './action-item.routes';
import { sendSuccess } from '@/utils/response';

const router = Router();

// ─── Health & Readiness ───────────────────────────────────────────────────────

/**
 * @route  GET /health
 * @desc   Liveness probe — confirms the process is running
 * @access Public
 */
router.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route  GET /ready
 * @desc   Readiness probe — confirms dependencies are available
 * @access Public
 */
router.get('/ready', (_req: Request, res: Response) => {
  // TODO: Check DB connection, Redis, etc. and return 503 if any are unavailable
  sendSuccess(res, { status: 'ready', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const apiBase = `/api/${config.app.apiVersion}`;

router.use(`${apiBase}/auth`, authRouter);
router.use(`${apiBase}/meetings`, meetingRouter);
router.use(`${apiBase}/action-items`, actionItemRouter);

export { router as apiRouter };
