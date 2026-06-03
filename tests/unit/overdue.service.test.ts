import { classifyActionItem } from '../../src/utils/overdue.helper';
import { ActionItemStatus } from '@prisma/client';

describe('Overdue Helper Unit tests', () => {
  const now = new Date('2026-06-03T12:00:00Z');

  it('should classify COMPLETED tasks as COMPLETED regardless of dueDate', () => {
    const item1 = {
      status: ActionItemStatus.COMPLETED,
      dueDate: new Date('2026-06-01T12:00:00Z'), // Past
    };
    expect(classifyActionItem(item1, now)).toBe('COMPLETED');

    const item2 = {
      status: ActionItemStatus.COMPLETED,
      dueDate: new Date('2026-06-10T12:00:00Z'), // Future
    };
    expect(classifyActionItem(item2, now)).toBe('COMPLETED');
  });

  it('should classify non-completed tasks with future due date as PENDING', () => {
    const item1 = {
      status: ActionItemStatus.PENDING,
      dueDate: new Date('2026-06-04T12:00:00Z'), // Future
    };
    expect(classifyActionItem(item1, now)).toBe('PENDING');

    const item2 = {
      status: ActionItemStatus.IN_PROGRESS,
      dueDate: new Date('2026-06-05T12:00:00Z'), // Future
    };
    expect(classifyActionItem(item2, now)).toBe('PENDING');
  });

  it('should classify non-completed tasks with null due date as PENDING', () => {
    const item = {
      status: ActionItemStatus.PENDING,
      dueDate: null,
    };
    expect(classifyActionItem(item, now)).toBe('PENDING');
  });

  it('should classify non-completed tasks with past due date as OVERDUE', () => {
    const item1 = {
      status: ActionItemStatus.PENDING,
      dueDate: new Date('2026-06-02T12:00:00Z'), // Past
    };
    expect(classifyActionItem(item1, now)).toBe('OVERDUE');

    const item2 = {
      status: ActionItemStatus.IN_PROGRESS,
      dueDate: new Date('2026-06-03T11:59:59Z'), // Past by 1 second
    };
    expect(classifyActionItem(item2, now)).toBe('OVERDUE');
  });
});
