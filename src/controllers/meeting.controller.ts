import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MeetingStatus } from '@prisma/client';
import { meetingService } from '@/services/meeting.service';
import { sendSuccess, sendCreated } from '@/utils/response';
import { AuthenticatedRequest } from '@/types';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const CreateMeetingSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters'),
  participants: z
    .array(z.string().trim().toLowerCase().email('Each participant must be a valid email address'))
    .min(1, 'At least one participant email is required'),
  meetingDate: z
    .string({ required_error: 'Meeting date is required' })
    .datetime({ message: 'meetingDate must be a valid ISO-8601 date string' })
    .transform((val) => new Date(val)),
  transcript: z
    .array(
      z.object({
        timestamp: z
          .string({ required_error: 'Transcript line timestamp is required' })
          .datetime({ message: 'Each timestamp must be a valid ISO-8601 date string' })
          .transform((val) => new Date(val)),
        speaker: z
          .string({ required_error: 'Transcript line speaker is required' })
          .trim()
          .min(1, 'Speaker name cannot be empty'),
        text: z
          .string({ required_error: 'Transcript line text is required' })
          .trim()
          .min(1, 'Transcript line text cannot be empty'),
      }),
    )
    .min(1, 'Transcript must contain at least one line'),
});

export const GetMeetingsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, Math.min(100, parseInt(val, 10) || 10)) : 10)),
  status: z
    .nativeEnum(MeetingStatus, {
      errorMap: () => ({ message: 'Invalid status value' }),
    })
    .optional(),
  from: z
    .string()
    .datetime({ message: 'from date must be a valid ISO-8601 date string' })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  to: z
    .string()
    .datetime({ message: 'to date must be a valid ISO-8601 date string' })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const MeetingParamsSchema = z.object({
  id: z.string().uuid('Meeting ID must be a valid UUID'),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export class MeetingController {
  /**
   * GET /meetings — list meetings for the authenticated user with pagination and filters
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { page, limit, status, from, to } = req.query as unknown as z.infer<
        typeof GetMeetingsQuerySchema
      >;

      const result = await meetingService.findAll({
        page,
        limit,
        status,
        from,
        to,
        userId: authReq.user.userId,
      });

      sendSuccess(res, {
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /meetings/:id — get a single meeting by ID (with ordered transcript lines)
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params as z.infer<typeof MeetingParamsSchema>;

      const meeting = await meetingService.findById(id, authReq.user.userId);
      sendSuccess(res, meeting);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /meetings — create a meeting and save transcript in a transaction
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const body = req.body as z.infer<typeof CreateMeetingSchema>;

      const meeting = await meetingService.create(body, authReq.user.userId);
      sendCreated(res, meeting);
    } catch (err) {
      next(err);
    }
  };
}

export const meetingController = new MeetingController();
