import { Router } from 'express';
import {
  meetingController,
  CreateMeetingSchema,
  UpdateMeetingSchema,
  MeetingParamsSchema,
} from '@/controllers';
import { authenticate, validate } from '@/middleware';

const router = Router();

// All meeting routes require authentication
router.use(authenticate);

/**
 * @route  GET /api/v1/meetings
 * @desc   List all meetings (paginated)
 * @access Private
 */
router.get('/', meetingController.list);

/**
 * @route  GET /api/v1/meetings/:id
 * @desc   Get a single meeting by ID
 * @access Private
 */
router.get('/:id', validate(MeetingParamsSchema, 'params'), meetingController.getById);

/**
 * @route  POST /api/v1/meetings
 * @desc   Create a new meeting
 * @access Private
 */
router.post('/', validate(CreateMeetingSchema), meetingController.create);

/**
 * @route  PATCH /api/v1/meetings/:id
 * @desc   Update a meeting
 * @access Private
 */
router.patch(
  '/:id',
  validate(MeetingParamsSchema, 'params'),
  validate(UpdateMeetingSchema),
  meetingController.update,
);

/**
 * @route  DELETE /api/v1/meetings/:id
 * @desc   Delete a meeting
 * @access Private
 */
router.delete('/:id', validate(MeetingParamsSchema, 'params'), meetingController.remove);

/**
 * @route  POST /api/v1/meetings/:id/cancel
 * @desc   Cancel a meeting
 * @access Private
 */
router.post('/:id/cancel', validate(MeetingParamsSchema, 'params'), meetingController.cancel);

export { router as meetingRouter };
