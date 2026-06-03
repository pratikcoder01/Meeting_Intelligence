import { prisma } from '@/services/database.service';
import { NotFoundError, ForbiddenError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { Meeting, MeetingStatus, TranscriptLine, Prisma } from '@prisma/client';

export type MeetingWithTranscript = Meeting & {
  transcriptLines: TranscriptLine[];
};

export interface CreateMeetingInput {
  title: string;
  participants: string[];
  meetingDate: Date;
  transcript: Array<{
    timestamp: Date;
    speaker: string;
    text: string;
  }>;
}

export interface FindAllMeetingsParams {
  page: number;
  limit: number;
  status?: MeetingStatus;
  from?: Date;
  to?: Date;
  userId: string;
}

export interface PaginatedMeetingsResult {
  data: Meeting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MeetingService {
  /**
   * Create a new meeting and save its transcript lines in a database transaction.
   * Returns the full meeting with transcript lines.
   */
  async create(data: CreateMeetingInput, createdBy: string): Promise<MeetingWithTranscript> {
    const meeting = await prisma.$transaction(async (tx) => {
      const created = await tx.meeting.create({
        data: {
          title: data.title,
          participants: data.participants,
          meetingDate: data.meetingDate,
          createdBy,
          status: MeetingStatus.SCHEDULED,
          transcriptLines: {
            create: data.transcript.map((line, index) => ({
              timestamp: line.timestamp,
              speaker: line.speaker,
              text: line.text,
              order: index,
            })),
          },
        },
        include: {
          transcriptLines: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });
      return created;
    });

    logger.info('Meeting created in database', { meetingId: meeting.id, createdBy });
    return meeting;
  }

  /**
   * Find a meeting by ID, including its transcript lines ordered by timestamp/order.
   * Throws NotFoundError if not found, and ForbiddenError if ownership check fails.
   */
  async findById(id: string, userId: string): Promise<MeetingWithTranscript> {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        transcriptLines: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundError('Meeting', id);
    }

    if (meeting.createdBy !== userId) {
      throw new ForbiddenError('You do not have permission to access this meeting');
    }

    return meeting;
  }

  /**
   * List meetings for the authenticated user with pagination and optional filtering by status/date range.
   */
  async findAll(params: FindAllMeetingsParams): Promise<PaginatedMeetingsResult> {
    const { page, limit, status, from, to, userId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.MeetingWhereInput = {
      createdBy: userId,
      ...(status !== undefined && { status }),
      ...((from !== undefined || to !== undefined) && {
        meetingDate: {
          ...(from !== undefined && { gte: from }),
          ...(to !== undefined && { lte: to }),
        },
      }),
    };

    const [total, data] = await prisma.$transaction([
      prisma.meeting.count({ where }),
      prisma.meeting.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          meetingDate: 'desc',
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
}

export const meetingService = new MeetingService();
