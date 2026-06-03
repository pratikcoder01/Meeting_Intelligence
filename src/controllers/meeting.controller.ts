import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { meetingService } from '@/services';
import { sendSuccess, sendCreated, sendNoContent, buildPaginationMeta } from '@/utils/response';
import { AuthenticatedRequest } from '@/types';
import { clamp, parseIntSafe } from '@/utils/helpers';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
export const CreateMeetingSchema = z.object({
  title:        z.string().min(1).max(200),
  description:  z.string().max(2000).optional(),
  scheduledAt:  z.coerce.date(),
  duration:     z.number().int().positive().max(480).optional(), // max 8h
  participants: z.array(z.string().uuid()).optional(),
});

export const UpdateMeetingSchema = CreateMeetingSchema.partial().omit({ participants: true });

export const MeetingParamsSchema = z.object({
  id: z.string().uuid('Meeting ID must be a valid UUID'),
});

// ─── Controller ───────────────────────────────────────────────────────────────
export class MeetingController {
  /**
   * GET /meetings — list meetings with pagination
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page    = clamp(parseIntSafe(req.query['page'] as string | undefined, 1), 1, 10000);
      const perPage = clamp(parseIntSafe(req.query['perPage'] as string | undefined, 20), 1, 100);

      const result = await meetingService.findAll({ page, perPage });
      const meta   = buildPaginationMeta(result.total, result.page, result.perPage);

      // Unified envelope: { traceId, success: true, data: { items, meta } }
      sendSuccess(res, { items: result.data, meta });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /meetings/:id — get a single meeting by ID
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as z.infer<typeof MeetingParamsSchema>;
      const meeting = await meetingService.findById(id);
      sendSuccess(res, meeting);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /meetings — create a meeting
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const body    = req.body as z.infer<typeof CreateMeetingSchema>;

      const meeting = await meetingService.create({
        ...body,
        // `userId` is the field name on JwtUserPayload (updated from `sub`)
        organizerId: authReq.user.userId,
      });

      sendCreated(res, meeting);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /meetings/:id — update a meeting
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as z.infer<typeof MeetingParamsSchema>;
      const body   = req.body as z.infer<typeof UpdateMeetingSchema>;

      const meeting = await meetingService.update(id, body);
      sendSuccess(res, meeting);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /meetings/:id — delete a meeting
   */
  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as z.infer<typeof MeetingParamsSchema>;
      await meetingService.delete(id);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /meetings/:id/cancel — cancel a meeting
   */
  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as z.infer<typeof MeetingParamsSchema>;
      const meeting = await meetingService.cancel(id);
      sendSuccess(res, meeting);
    } catch (err) {
      next(err);
    }
  };
}

export const meetingController = new MeetingController();
