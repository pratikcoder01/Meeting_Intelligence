import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '@/services/database.service';
import { emailService } from '@/services/email.service';
import { logger } from '@/utils/logger';
import {
  ActionItem,
  ActionItemStatus,
  ReminderChannel,
  ReminderDeliveryStatus,
} from '@prisma/client';

let scheduledTask: ScheduledTask | null = null;

/**
 * Regex to validate simple email structure for fallback checks.
 */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resolves the target recipient email for an action item reminder.
 */
const getRecipientEmail = (
  item: ActionItem & {
    meeting: { creator: { email: string } };
    assigneeUser: { email: string } | null;
  },
): string | null => {
  // 1. If linked to a registered user, use their email
  if (item.assigneeUser?.email) {
    return item.assigneeUser.email;
  }

  // 2. If free-form assignee string is a valid email, use it
  if (emailRegex.test(item.assignee)) {
    return item.assignee;
  }

  // 3. Fallback to meeting creator
  if (item.meeting?.creator?.email) {
    return item.meeting.creator.email;
  }

  return null;
};

/**
 * Queries overdue action items and dispatches email reminders, logging the audit trail.
 */
export const processOverdueReminders = async (): Promise<void> => {
  logger.info('Starting overdue action items reminder execution...');
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();

    const overdueItems = await prisma.actionItem.findMany({
      where: {
        status: {
          not: ActionItemStatus.COMPLETED,
        },
        dueDate: {
          lt: now,
        },
        reminderLogs: {
          none: {
            sentAt: {
              gte: twentyFourHoursAgo,
            },
          },
        },
      },
      include: {
        meeting: {
          include: {
            creator: {
              select: {
                email: true,
              },
            },
          },
        },
        assigneeUser: {
          select: {
            email: true,
          },
        },
      },
    });

    logger.info(`Found ${overdueItems.length} overdue action items requiring reminders`);

    for (const item of overdueItems) {
      const recipient = getRecipientEmail(item);
      if (!recipient) {
        logger.warn('Skipping action item reminder: No valid recipient found', {
          actionItemId: item.id,
          assignee: item.assignee,
        });
        continue;
      }

      if (!item.dueDate) {
        logger.warn('Skipping action item reminder: Missing due date', {
          actionItemId: item.id,
        });
        continue;
      }

      try {
        const result = await emailService.sendOverdueReminder({
          to: recipient,
          task: item.task,
          meetingTitle: item.meeting.title,
          assignee: item.assignee,
          dueDate: item.dueDate,
        });

        // Log execution to ReminderLog
        await prisma.reminderLog.create({
          data: {
            actionItemId: item.id,
            sentAt: new Date(),
            recipient,
            channel: ReminderChannel.EMAIL,
            status: result.success
              ? ReminderDeliveryStatus.DELIVERED
              : ReminderDeliveryStatus.FAILED,
            errorMessage: result.error ?? null,
          },
        });

        if (result.success) {
          logger.info('Overdue reminder sent successfully', {
            actionItemId: item.id,
            recipient,
          });
        } else {
          logger.error('Failed to send overdue reminder email', {
            actionItemId: item.id,
            recipient,
            error: result.error,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('Error during action item reminder dispatch loop', {
          actionItemId: item.id,
          error: message,
        });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Error in overdue action items reminder scheduler task', {
      error: message,
    });
  }
};

/**
 * Starts the overdue action item reminder background scheduler.
 */
export const start = (): void => {
  if (scheduledTask) {
    logger.warn('Overdue action item reminder scheduler is already running');
    return;
  }

  // Run every 15 minutes
  scheduledTask = cron.schedule('*/15 * * * *', () => {
    void processOverdueReminders();
  });

  logger.info('Overdue action item reminder scheduler started (configured for every 15 minutes)');
};

/**
 * Stops the overdue action item reminder background scheduler.
 */
export const stop = (): void => {
  if (!scheduledTask) {
    logger.warn('Overdue action item reminder scheduler is not running');
    return;
  }

  void scheduledTask.stop();
  scheduledTask = null;
  logger.info('Overdue action item reminder scheduler stopped');
};
