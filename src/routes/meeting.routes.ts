/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express';
import {
  meetingController,
  CreateMeetingSchema,
  GetMeetingsQuerySchema,
  MeetingParamsSchema,
} from '@/controllers';
import { authenticate, validate } from '@/middleware';

const router = Router();

// All meeting routes require authentication
router.use(authenticate);

/**
 * @route  GET /api/v1/meetings
 * @desc   List meetings for the authenticated user (paginated with filters)
 * @access Private
 */
router.get('/', validate(GetMeetingsQuerySchema, 'query'), meetingController.list);

/**
 * @route  GET /api/v1/meetings/:id
 * @desc   Get a single meeting by ID (with ordered transcript)
 * @access Private
 */
router.get('/:id', validate(MeetingParamsSchema, 'params'), meetingController.getById);

/**
 * @route  POST /api/v1/meetings
 * @desc   Create a new meeting (saves transcript lines in a transaction)
 * @access Private
 */
router.post('/', validate(CreateMeetingSchema), meetingController.create);

export { router as meetingRouter };
