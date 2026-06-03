import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/services/database.service';
import { generateTokenPair } from '../../src/services/auth.service';
import { UserRole } from '../../src/types';
import { emailService } from '../../src/services/email.service';
import { processOverdueReminders } from '../../src/services/scheduler.service';

const app = createApp();

describe('Overdue Action Items & Scheduler (Integration)', () => {
  let token: string;
  let userId: string;
  let meetingId: string;
  let overdueItemId: string;

  beforeEach(async () => {
    // 1. Setup user and tokens
    const user = await prisma.user.create({
      data: {
        name: 'Manager Bob',
        email: 'bob.manager@example.com',
        passwordHash: 'hashedpassword',
      },
    });
    userId = user.id;

    const tokens = generateTokenPair(user.id, user.email, UserRole.MEMBER);
    token = tokens.accessToken;

    // 2. Setup meeting
    const meeting = await prisma.meeting.create({
      data: {
        title: 'Project Status Review',
        participants: ['bob.manager@example.com'],
        meetingDate: new Date('2026-06-03T10:00:00Z'),
        createdBy: userId,
      },
    });
    meetingId = meeting.id;

    const pastDueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const futureDueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days in future

    // 3. Create items
    // Overdue item
    const overdueItem = await prisma.actionItem.create({
      data: {
        meetingId,
        task: 'Submit Q3 roadmap',
        assignee: 'bob.manager@example.com',
        dueDate: pastDueDate,
        status: 'PENDING',
        citations: [],
      },
    });
    overdueItemId = overdueItem.id;

    // Pending item
    await prisma.actionItem.create({
      data: {
        meetingId,
        task: 'Prepare demo slides',
        assignee: 'bob.manager@example.com',
        dueDate: futureDueDate,
        status: 'PENDING',
        citations: [],
      },
    });
    // Completed item (due in past but completed)
    await prisma.actionItem.create({
      data: {
        meetingId,
        task: 'Sign budget draft',
        assignee: 'bob.manager@example.com',
        dueDate: pastDueDate,
        status: 'COMPLETED',
        citations: [],
      },
    });
  });

  describe('GET /api/v1/action-items/overdue', () => {
    it('should return only overdue, non-completed action items', async () => {
      const res = await request(app)
        .get('/api/v1/action-items/overdue')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(overdueItemId);
      expect(res.body.data[0].task).toBe('Submit Q3 roadmap');
    });
  });

  describe('Scheduler & Email Reminder Dispatching', () => {
    it('should query overdue items, mock email send, and log successful execution in database', async () => {
      // Mock the sendOverdueReminder method
      const sendEmailSpy = jest
        .spyOn(emailService, 'sendOverdueReminder')
        .mockImplementation(async () => {
          return { success: true };
        });

      // Run scheduler process
      await processOverdueReminders();

      // Assert that email sending was triggered once for the overdue item
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      expect(sendEmailSpy).toHaveBeenCalledWith({
        to: 'bob.manager@example.com',
        task: 'Submit Q3 roadmap',
        meetingTitle: 'Project Status Review',
        assignee: 'bob.manager@example.com',
        dueDate: expect.any(Date),
      });

      // Assert that reminder log was written to the database audit trail
      const logs = await prisma.reminderLog.findMany({
        where: { actionItemId: overdueItemId },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('DELIVERED');
      expect(logs[0].recipient).toBe('bob.manager@example.com');

      sendEmailSpy.mockRestore();
    });
  });
});
