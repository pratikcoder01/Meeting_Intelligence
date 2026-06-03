import { meetingService } from '../../src/services/meeting.service';
import { prisma } from '../../src/services/database.service';

describe('Meeting Service Database tests', () => {
  let userId: string;

  beforeEach(async () => {
    // Create a mock user in the test database
    const user = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'dummyhash',
      },
    });
    userId = user.id;
  });

  describe('create()', () => {
    it('should create a meeting with transcript lines in a transaction', async () => {
      const meetingInput = {
        title: 'Development Sprint Planning',
        participants: ['alice@example.com', 'bob@example.com'],
        meetingDate: new Date('2026-06-03T10:00:00Z'),
        transcript: [
          {
            timestamp: new Date('2026-06-03T10:00:05Z'),
            speaker: 'Alice',
            text: 'I will write the test cases for Express controllers.',
          },
          {
            timestamp: new Date('2026-06-03T10:00:15Z'),
            speaker: 'Bob',
            text: 'I will configure Jest and supertest packages.',
          },
        ],
      };

      const meeting = await meetingService.create(meetingInput, userId);

      expect(meeting).toBeDefined();
      expect(meeting.title).toBe(meetingInput.title);
      expect(meeting.createdBy).toBe(userId);
      expect(meeting.participants).toEqual(meetingInput.participants);
      expect(meeting.transcriptLines).toHaveLength(2);
      expect(meeting.transcriptLines[0].speaker).toBe('Alice');
      expect(meeting.transcriptLines[0].order).toBe(0);
      expect(meeting.transcriptLines[1].order).toBe(1);
    });
  });

  describe('findAll() pagination & logic', () => {
    beforeEach(async () => {
      // Seed three meetings
      for (let i = 1; i <= 3; i++) {
        await prisma.meeting.create({
          data: {
            title: `Meeting ${i}`,
            participants: ['john@example.com'],
            meetingDate: new Date(`2026-06-03T1${i}:00:00Z`),
            createdBy: userId,
          },
        });
      }
    });

    it('should list meetings with pagination correctly', async () => {
      const result = await meetingService.findAll({
        page: 1,
        limit: 2,
        userId,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it('should fetch page 2 correctly', async () => {
      const result = await meetingService.findAll({
        page: 2,
        limit: 2,
        userId,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.page).toBe(2);
    });
  });
});
