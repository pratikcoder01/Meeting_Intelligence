import { Meeting, MeetingStatus, PaginatedResult, PaginationParams, TranscriptionStatus } from '@/types';
import { NotFoundError, ConflictError } from '@/utils/errors';
import { generateId } from '@/utils/helpers';
import { logger } from '@/utils/logger';

// ─── In-Memory Store (replace with Prisma queries in production) ─────────────
// This implementation uses an in-memory store as a placeholder so the service
// layer compiles and runs without a live database. Replace each method body
// with `prisma.meeting.*` calls once your schema is defined.

const meetingStore = new Map<string, Meeting>();

// ─── Meeting Service ──────────────────────────────────────────────────────────
export class MeetingService {
  /**
   * Create a new meeting.
   */
  async create(
    data: {
      title: string;
      description?: string;
      scheduledAt: Date;
      duration?: number;
      organizerId: string;
      participants?: string[];
    },
  ): Promise<Meeting> {
    const meeting: Meeting = {
      id: generateId(),
      title: data.title,
      description: data.description,
      scheduledAt: data.scheduledAt,
      duration: data.duration,
      status: MeetingStatus.SCHEDULED,
      organizerId: data.organizerId,
      participants: data.participants ?? [],
      transcriptionStatus: TranscriptionStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    meetingStore.set(meeting.id, meeting);
    logger.info('Meeting created', { meetingId: meeting.id, organizerId: data.organizerId });
    return meeting;
  }

  /**
   * Find a meeting by ID; throws NotFoundError if missing.
   */
  async findById(id: string): Promise<Meeting> {
    const meeting = meetingStore.get(id);
    if (!meeting) {
      throw new NotFoundError('Meeting', id);
    }
    return meeting;
  }

  /**
   * List meetings with pagination.
   */
  async findAll(params: PaginationParams): Promise<PaginatedResult<Meeting>> {
    const all = Array.from(meetingStore.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const start = (params.page - 1) * params.perPage;
    const data = all.slice(start, start + params.perPage);

    return { data, total: all.length, page: params.page, perPage: params.perPage };
  }

  /**
   * Update a meeting's metadata.
   */
  async update(
    id: string,
    data: Partial<Pick<Meeting, 'title' | 'description' | 'scheduledAt' | 'duration' | 'status'>>,
  ): Promise<Meeting> {
    const existing = await this.findById(id);
    const updated: Meeting = { ...existing, ...data, updatedAt: new Date() };
    meetingStore.set(id, updated);
    logger.info('Meeting updated', { meetingId: id });
    return updated;
  }

  /**
   * Delete a meeting by ID.
   */
  async delete(id: string): Promise<void> {
    await this.findById(id); // throws if not found
    meetingStore.delete(id);
    logger.info('Meeting deleted', { meetingId: id });
  }

  /**
   * Mark a meeting as cancelled (soft approach via status).
   */
  async cancel(id: string): Promise<Meeting> {
    const meeting = await this.findById(id);
    if (meeting.status === MeetingStatus.CANCELLED) {
      throw new ConflictError('Meeting is already cancelled');
    }
    return this.update(id, { status: MeetingStatus.CANCELLED });
  }
}

export const meetingService = new MeetingService();
