import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/services/database.service';
import { generateTokenPair } from '../../src/services/auth.service';
import { UserRole } from '../../src/types';

const app = createApp();

describe('Meeting Analysis Endpoints (Integration)', () => {
  let token: string;
  let userId: string;
  let meetingId: string;
  let lineId: string;

  beforeEach(async () => {
    // 1. Create user and get token
    const user = await prisma.user.create({
      data: {
        name: 'Manager Alice',
        email: 'alice.manager@example.com',
        passwordHash: 'hashedpassword',
      },
    });
    userId = user.id;

    const tokens = generateTokenPair(user.id, user.email, UserRole.MEMBER);
    token = tokens.accessToken;

    // 2. Create a meeting with transcript lines
    const meeting = await prisma.meeting.create({
      data: {
        title: 'Q3 Product Strategy Review',
        participants: ['alice.manager@example.com'],
        meetingDate: new Date('2026-06-03T10:00:00Z'),
        createdBy: userId,
      },
    });
    meetingId = meeting.id;

    const line = await prisma.transcriptLine.create({
      data: {
        meetingId,
        timestamp: new Date('2026-06-03T10:01:00Z'),
        speaker: 'Alice',
        text: 'I will write the specification document by Friday.',
        order: 0,
      },
    });
    lineId = line.id;
  });

  it('should run AI analysis and check that generated citations and items match', async () => {
    // 1. Fetch analysis before running — should return 404 (or error code)
    const initAnalysisRes = await request(app)
      .get(`/api/v1/meetings/${meetingId}/analysis`)
      .set('Authorization', `Bearer ${token}`);

    expect(initAnalysisRes.status).toBe(404);

    // Mock Anthropic / Claude HTTP fetch in case the controller is ever modified to fetch from Anthropic
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            content: [{ text: 'Mocked Claude Response' }],
          }),
          { status: 200 },
        ),
      ),
    );

    // 2. Run analysis
    const analyzeRes = await request(app)
      .post(`/api/v1/meetings/${meetingId}/analyze`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(analyzeRes.status).toBe(200);
    expect(analyzeRes.body.success).toBe(true);
    expect(analyzeRes.body.data.meetingId).toBe(meetingId);
    expect(analyzeRes.body.data.summary).toBeDefined();

    // 3. Fetch the analysis again — should now return 200 success
    const getAnalysisRes = await request(app)
      .get(`/api/v1/meetings/${meetingId}/analysis`)
      .set('Authorization', `Bearer ${token}`);

    expect(getAnalysisRes.status).toBe(200);
    expect(getAnalysisRes.body.success).toBe(true);
    expect(getAnalysisRes.body.data.summary.topics).toContain('Sprint Status');

    // 4. Verify citations exist for action items that were generated
    const actionItemsRes = await request(app)
      .get('/api/v1/action-items')
      .set('Authorization', `Bearer ${token}`)
      .query({ meetingId });

    expect(actionItemsRes.status).toBe(200);
    expect(actionItemsRes.body.data.data).toHaveLength(1);
    
    const taskItem = actionItemsRes.body.data.data[0];
    expect(taskItem.citations).toBeDefined();
    expect(taskItem.citations).toHaveLength(1);
    expect(taskItem.citations[0].lineId).toBe(lineId);

    // Restore fetch spy
    fetchSpy.mockRestore();
  });
});
