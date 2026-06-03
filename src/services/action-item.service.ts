import { prisma } from '@/services/database.service';
import { NotFoundError, ForbiddenError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { ActionItem, ActionItemStatus, Prisma } from '@prisma/client';

export interface CreateActionItemInput {
  meetingId: string;
  task: string;
  assignee: string;
  dueDate: Date;
  citations?: unknown;
}

export interface FindAllActionItemsParams {
  page: number;
  limit: number;
  status?: ActionItemStatus;
  assignee?: string;
  meetingId?: string;
}

export interface PaginatedActionItemsResult {
  data: (ActionItem & { meeting: { title: string } })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ActionItemService {
  /**
   * Create a new action item.
   * Validates that the associated meeting exists and is owned by the user.
   * Auto-resolves assigneeUserId if assignee matches a user's email.
   */
  async create(data: CreateActionItemInput, userId: string): Promise<ActionItem> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: data.meetingId },
    });

    if (!meeting) {
      throw new NotFoundError('Meeting', data.meetingId);
    }

    if (meeting.createdBy !== userId) {
      throw new ForbiddenError('You do not have permission to add action items to this meeting');
    }

    // Try to resolve assignee email to a registered User
    const matchedUser = await prisma.user.findUnique({
      where: { email: data.assignee.trim().toLowerCase() },
    });
    const assigneeUserId = matchedUser?.id ?? null;

    const actionItem = await prisma.actionItem.create({
      data: {
        meetingId: data.meetingId,
        task: data.task,
        assignee: data.assignee,
        assigneeUserId,
        dueDate: data.dueDate,
        citations: data.citations !== undefined ? (data.citations as Prisma.InputJsonValue) : [],
        status: ActionItemStatus.PENDING,
      },
    });

    logger.info('Action item created in database', {
      actionItemId: actionItem.id,
      meetingId: data.meetingId,
      assigneeUserId,
    });

    return actionItem;
  }

  /**
   * Update the status of an action item.
   * Validates ownership of the parent meeting.
   */
  async updateStatus(id: string, status: ActionItemStatus, userId: string): Promise<ActionItem> {
    const actionItem = await prisma.actionItem.findUnique({
      where: { id },
      include: {
        meeting: true,
      },
    });

    if (!actionItem) {
      throw new NotFoundError('Action item', id);
    }

    if (actionItem.meeting.createdBy !== userId) {
      throw new ForbiddenError('You do not have permission to update this action item');
    }

    const updated = await prisma.actionItem.update({
      where: { id },
      data: { status },
    });

    logger.info('Action item status updated', { actionItemId: id, status });
    return updated;
  }

  /**
   * List action items for the user's meetings with pagination and filters.
   */
  async findAll(
    params: FindAllActionItemsParams,
    userId: string,
  ): Promise<PaginatedActionItemsResult> {
    const { page, limit, status, assignee, meetingId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ActionItemWhereInput = {
      meeting: {
        createdBy: userId,
      },
      ...(status !== undefined && { status }),
      ...(meetingId !== undefined && { meetingId }),
      ...(assignee !== undefined && {
        assignee: {
          contains: assignee.trim(),
          mode: 'insensitive',
        },
      }),
    };

    const [total, data] = await prisma.$transaction([
      prisma.actionItem.count({ where }),
      prisma.actionItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: {
              title: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Find overdue action items for the user's meetings.
   */
  async findOverdue(userId: string): Promise<(ActionItem & { meeting: { title: string } })[]> {
    const now = new Date();

    const overdue = await prisma.actionItem.findMany({
      where: {
        meeting: {
          createdBy: userId,
        },
        status: {
          not: ActionItemStatus.COMPLETED,
        },
        dueDate: {
          lt: now,
        },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        meeting: {
          select: {
            title: true,
          },
        },
      },
    });

    return overdue;
  }
}

export const actionItemService = new ActionItemService();
