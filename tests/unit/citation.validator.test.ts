import { validateCitations } from '../../src/utils/citation.validator';
import { prisma } from '../../src/services/database.service';

describe('Citation Validator Unit tests', () => {
  let userId: string;
  let meetingId: string;
  let lineId: string;
  const lineText = 'I will build the frontend pages.';
  const timestamp = new Date('2026-06-03T10:00:00.000Z');

  beforeEach(async () => {
    // Seed user, meeting, and transcript line
    const user = await prisma.user.create({
      data: {
        name: 'Alice',
        email: 'alice@example.com',
        passwordHash: 'hashedpassword',
      },
    });
    userId = user.id;

    const meeting = await prisma.meeting.create({
      data: {
        title: 'Project Kickoff',
        participants: ['alice@example.com'],
        meetingDate: new Date('2026-06-03T09:30:00.000Z'),
        createdBy: userId,
      },
    });
    meetingId = meeting.id;

    const line = await prisma.transcriptLine.create({
      data: {
        meetingId,
        timestamp,
        speaker: 'Alice',
        text: lineText,
        order: 0,
      },
    });
    lineId = line.id;
  });

  it('should pass with a valid citation matching the DB record', async () => {
    const citations = [
      {
        lineId,
        text: lineText,
        timestamp: timestamp.toISOString(),
      },
    ];

    const isValid = await validateCitations(citations, meetingId);
    expect(isValid).toBe(true);
  });

  it('should fail if citations list is empty or missing', async () => {
    expect(await validateCitations([], meetingId)).toBe(false);
    expect(await validateCitations(undefined, meetingId)).toBe(false);
  });

  it('should fail/reject if citation contains an invented timestamp', async () => {
    const citations = [
      {
        lineId,
        text: lineText,
        timestamp: new Date('2026-06-03T10:05:00.000Z').toISOString(), // Invented
      },
    ];

    const isValid = await validateCitations(citations, meetingId);
    expect(isValid).toBe(false);
  });

  it('should fail/reject if citation text does not match database record', async () => {
    const citations = [
      {
        lineId,
        text: 'Some other invented speech text', // Mismatch
        timestamp: timestamp.toISOString(),
      },
    ];

    const isValid = await validateCitations(citations, meetingId);
    expect(isValid).toBe(false);
  });

  it('should fail if lineId is missing or invalid UUID', async () => {
    const citations = [
      {
        text: lineText,
        timestamp: timestamp.toISOString(),
      },
    ];

    const isValid = await validateCitations(citations, meetingId);
    expect(isValid).toBe(false);
  });
});
