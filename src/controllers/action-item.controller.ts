import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ActionItemStatus } from '@prisma/client';
import { actionItemService } from '@/services/action-item.service';
import { sendSuccess, sendCreated } from '@/utils/response';
import { AuthenticatedRequest } from '@/types';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const CreateActionItemSchema = z.object({
  meetingId: z.string().uuid('meetingId must be a valid UUID'),
  task: z
    .string({ required_error: 'Task is required' })
    .trim()
    .min(1, 'Task cannot be empty')
    .max(1000, 'Task cannot exceed 1000 characters'),
  assignee: z
    .string({ required_error: 'Assignee is required' })
    .trim()
    .min(1, 'Assignee cannot be empty')
    .max(200, 'Assignee cannot exceed 200 characters'),
  dueDate: z
    .string({ required_error: 'dueDate is required' })
    .datetime({ message: 'dueDate must be a valid ISO-8601 date string' })
    .transform((val) => new Date(val)),
  citations: z
    .array(
      z.object({
        lineId: z.string().uuid('lineId must be a valid UUID').optional(),
        text: z.string().trim().min(1, 'Citation text cannot be empty'),
        timestamp: z
          .string()
          .datetime({ message: 'Citation timestamp must be a valid ISO-8601 date string' }),
      }),
    )
    .optional()
    .default([]),
});

export const UpdateActionItemStatusSchema = z.object({
  status: z.nativeEnum(ActionItemStatus, {
    errorMap: () => ({ message: 'Status must be PENDING, IN_PROGRESS, or COMPLETED' }),
  }),
});

export const GetActionItemsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, Math.min(100, parseInt(val, 10) || 10)) : 10)),
  status: z.nativeEnum(ActionItemStatus).optional(),
  assignee: z.string().trim().optional(),
  meetingId: z.string().uuid('meetingId filter must be a valid UUID').optional(),
});

export const ActionItemParamsSchema = z.object({
  id: z.string().uuid('Action item ID must be a valid UUID'),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export class ActionItemController {
  /**
   * POST /action-items — Create a new action item
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const body = req.body as z.infer<typeof CreateActionItemSchema>;

      const actionItem = await actionItemService.create(body, authReq.user.userId);
      sendCreated(res, actionItem);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /action-items/:id/status — Update action item status
   */
  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id } = req.params as z.infer<typeof ActionItemParamsSchema>;
      const { status } = req.body as z.infer<typeof UpdateActionItemStatusSchema>;

      const updated = await actionItemService.updateStatus(id, status, authReq.user.userId);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /action-items — List action items with pagination and filters
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { page, limit, status, assignee, meetingId } = req.query as unknown as z.infer<
        typeof GetActionItemsQuerySchema
      >;

      const result = await actionItemService.findAll(
        { page, limit, status, assignee, meetingId },
        authReq.user.userId,
      );

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
   * GET /action-items/overdue — List overdue action items
   */
  listOverdue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const overdue = await actionItemService.findOverdue(authReq.user.userId);
      sendSuccess(res, overdue);
    } catch (err) {
      next(err);
    }
  };
}

export const actionItemController = new ActionItemController();
