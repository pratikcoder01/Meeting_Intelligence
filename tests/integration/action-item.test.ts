import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/services/database.service';
import { generateTokenPair } from '../../src/services/auth.service';
import { UserRole } from '../../src/types';

const app = createApp();

describe('Action Item Endpoint Flows (Integration)', () => {
  let token: string;
  let userId: string;
  let meetingId: string;

  beforeEach(async () => {
    // 1. Create user and get token
    const user = await prisma.user.create({
      data: {
        name: 'Tester Bob',
        email: 'bob.tester@example.com',
        passwordHash: 'hashedpassword',
      },
    });
    userId = user.id;

    const tokens = generateTokenPair(user.id, user.email, UserRole.MEMBER);
    token = tokens.accessToken;

    // 2. Create meeting
    const meeting = await prisma.meeting.create({
      data: {
        title: 'Sprint Planning',
        participants: ['bob.tester@example.com'],
        meetingDate: new Date('2026-06-03T10:00:00Z'),
        createdBy: userId,
      },
    });
    meetingId = meeting.id;
  });

  it('should create action item, update its status, and filter accordingly', async () => {
    // 1. Create action item
    const actionItemPayload = {
      meetingId,
      task: 'Configure deployment scripts',
      assignee: 'bob.tester@example.com',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const createRes = await request(app)
      .post('/api/v1/action-items')
      .set('Authorization', `Bearer ${token}`)
      .send(actionItemPayload);

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.task).toBe(actionItemPayload.task);
    expect(createRes.body.data.status).toBe('PENDING');

    const actionItemId = createRes.body.data.id;

    // 2. Query as PENDING — should contain the item
    const pendingFilterRes = await request(app)
      .get('/api/v1/action-items')
      .set('Authorization', `Bearer ${token}`)
      .query({ status: 'PENDING' });

    expect(pendingFilterRes.status).toBe(200);
    expect(pendingFilterRes.body.data.data).toHaveLength(1);
    expect(pendingFilterRes.body.data.data[0].id).toBe(actionItemId);

    // 3. Query as COMPLETED — should be empty
    const completedFilterRes = await request(app)
      .get('/api/v1/action-items')
      .set('Authorization', `Bearer ${token}`)
      .query({ status: 'COMPLETED' });

    expect(completedFilterRes.status).toBe(200);
    expect(completedFilterRes.body.data.data).toHaveLength(0);

    // 4. Update status to IN_PROGRESS
    const updateRes = await request(app)
      .patch(`/api/v1/action-items/${actionItemId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_PROGRESS' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.status).toBe('IN_PROGRESS');

    // 5. Query as IN_PROGRESS — should contain the item
    const ipFilterRes = await request(app)
      .get('/api/v1/action-items')
      .set('Authorization', `Bearer ${token}`)
      .query({ status: 'IN_PROGRESS' });

    expect(ipFilterRes.status).toBe(200);
    expect(ipFilterRes.body.data.data).toHaveLength(1);
    expect(ipFilterRes.body.data.data[0].id).toBe(actionItemId);
  });
});
