import { ActionItemStatus } from '@prisma/client';

export type TaskClassification = 'OVERDUE' | 'PENDING' | 'COMPLETED';

/**
 * Classifies an action item's status relative to a point in time.
 */
export function classifyActionItem(
  item: { status: ActionItemStatus; dueDate: Date | null },
  now: Date = new Date(),
): TaskClassification {
  if (item.status === ActionItemStatus.COMPLETED) {
    return 'COMPLETED';
  }

  if (item.dueDate && new Date(item.dueDate) < now) {
    return 'OVERDUE';
  }

  return 'PENDING';
}
