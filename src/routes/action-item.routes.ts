/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express';
import {
  actionItemController,
  CreateActionItemSchema,
  UpdateActionItemStatusSchema,
  GetActionItemsQuerySchema,
  ActionItemParamsSchema,
} from '@/controllers';
import { authenticate, validate } from '@/middleware';

const router = Router();

// All action item routes require authentication
router.use(authenticate);

/**
 * @route  GET /api/v1/action-items/overdue
 * @desc   List all overdue action items (status != COMPLETED and dueDate < now)
 * @access Private
 */
router.get('/overdue', actionItemController.listOverdue);

/**
 * @route  GET /api/v1/action-items
 * @desc   List all action items (paginated with filters)
 * @access Private
 */
router.get('/', validate(GetActionItemsQuerySchema, 'query'), actionItemController.list);

/**
 * @route  POST /api/v1/action-items
 * @desc   Create a new action item
 * @access Private
 */
router.post('/', validate(CreateActionItemSchema), actionItemController.create);

/**
 * @route  PATCH /api/v1/action-items/:id/status
 * @desc   Update status of an action item
 * @access Private
 */
router.patch(
  '/:id/status',
  validate(ActionItemParamsSchema, 'params'),
  validate(UpdateActionItemStatusSchema),
  actionItemController.updateStatus,
);

export { router as actionItemRouter };
