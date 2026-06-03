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

  /**
   * Find the analysis for a meeting.
   * Throws NotFoundError if meeting or analysis does not exist,
   * and ForbiddenError if ownership check fails.
   */
  async findAnalysis(meetingId: string, userId: string): Promise<any> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundError('Meeting', meetingId);
    }

    if (meeting.createdBy !== userId) {
      throw new ForbiddenError('You do not have permission to access this meeting');
    }

    const analysis = await prisma.meetingAnalysis.findUnique({
      where: { meetingId },
    });

    if (!analysis) {
      throw new NotFoundError('MeetingAnalysis', meetingId);
    }

    return analysis;
  }

  /**
   * Run a mock AI analysis for a meeting, generating summary, decisions, follow-ups,
   * and action items linked to the transcript line citations.
   */
  async generateAnalysis(meetingId: string, userId: string): Promise<any> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        transcriptLines: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundError('Meeting', meetingId);
    }

    if (meeting.createdBy !== userId) {
      throw new ForbiddenError('You do not have permission to analyze this meeting');
    }

    const lines = meeting.transcriptLines;
    const actionItemsData: any[] = [];

    // Formulate realistic mock action items based on transcript lines if available
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const line = lines[i];
      let taskText = `Follow up on: "${line.text.length > 60 ? line.text.substring(0, 57) + '...' : line.text}"`;
      
      // Look for action-like phrasing in the transcript speech
      if (line.text.toLowerCase().includes('will')) {
        const willIndex = line.text.toLowerCase().indexOf('will');
        taskText = line.text.substring(willIndex + 4).trim();
        // Capitalize first letter
        taskText = taskText.charAt(0).toUpperCase() + taskText.slice(1);
      }

      actionItemsData.push({
        task: taskText,
        assignee: line.speaker,
        dueDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000), // 1-3 days in future
        citations: [
          {
            lineId: line.id,
            text: line.text,
            timestamp: line.timestamp.toISOString(),
          },
        ],
      });
    }

    if (actionItemsData.length === 0) {
      actionItemsData.push({
        task: 'Document outcomes and outline next steps for the project',
        assignee: meeting.participants[0] || 'admin@example.com',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        citations: [],
      });
    }

    const summary = {
      text: `This meeting focused on "${meeting.title}". The participants reviewed the primary objectives, addressed operational queries, and established a series of clear milestones. Next steps involve finalizing API contracts and designing high-fidelity layouts for review.`,
      sentiment: 'collaborative',
      topics: ['Sprint Status', 'API Specifications', 'UI Elements Layout'],
    };

    const decisions = [
      {
        decision: `Standardize on using PostgreSQL + Prisma for database integrity across ${meeting.title}.`,
        madeBy: lines[0]?.speaker || 'The Team',
        timestamp: new Date().toISOString(),
      },
    ];

    const followups = [
      {
        topic: 'Coordinate timeline alignment across development squads',
        owner: meeting.participants[0] || 'admin@example.com',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // Execute deletion of old analysis and action items, and creation of new ones in a transaction
    const analysis = await prisma.$transaction(async (tx) => {
      // Delete existing analysis
      await tx.meetingAnalysis.deleteMany({
        where: { meetingId },
      });

      // Delete existing action items for this meeting
      await tx.actionItem.deleteMany({
        where: { meetingId },
      });

      // Create meeting analysis
      const createdAnalysis = await tx.meetingAnalysis.create({
        data: {
          meetingId,
          summary,
          actionItemsRaw: actionItemsData,
          decisions,
          followups,
        },
      });

      // Insert ActionItem records
      for (const item of actionItemsData) {
        // Resolve email to User ID if possible
        const matchedUser = await tx.user.findUnique({
          where: { email: item.assignee.trim().toLowerCase() },
        });
        const assigneeUserId = matchedUser?.id ?? null;

        await tx.actionItem.create({
          data: {
            meetingId,
            task: item.task,
            assignee: item.assignee,
            assigneeUserId,
            dueDate: item.dueDate,
            citations: item.citations,
            status: 'PENDING',
          },
        });
      }

      return createdAnalysis;
    });

    logger.info('Mock AI Analysis generated successfully', { meetingId, userId });
    return analysis;
  }
}

export const meetingService = new MeetingService();

