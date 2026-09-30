import { describe, expect, it, beforeEach } from 'vitest';
import { notificationHistoryService } from '@/services/notifications/notification-history.service';

beforeEach(() => {
  notificationHistoryService.clear();
});

describe('notificationHistoryService', () => {
  it('pushes entries newest-first via list', () => {
    notificationHistoryService.push({
      notificationId: 1,
      notificationName: 'n1',
      message: 'hello',
      channels: [{ type: 'email', ok: true, detail: null }],
    });
    notificationHistoryService.push({
      notificationId: 2,
      notificationName: 'n2',
      message: 'world',
      channels: [],
    });
    const list = notificationHistoryService.list();
    expect(list).toHaveLength(2);
    expect(list[0]?.notificationName).toBe('n2');
    expect(list[1]?.notificationName).toBe('n1');
    expect(list[0]?.id).toBeDefined();
    expect(list[0]?.triggeredAt).toBeDefined();
    expect(notificationHistoryService.count()).toBe(2);
  });

  it('caps entries at 200 FIFO', () => {
    for (let i = 0; i < 210; i++) {
      notificationHistoryService.push({
        notificationId: i,
        notificationName: `n${String(i)}`,
        message: 'm',
        channels: [],
      });
    }
    expect(notificationHistoryService.count()).toBe(200);
    const list = notificationHistoryService.list();
    expect(list[0]?.notificationName).toBe('n209');
  });

  it('clears entries', () => {
    notificationHistoryService.push({
      notificationId: 1,
      notificationName: 'n1',
      message: 'm',
      channels: [],
    });
    notificationHistoryService.clear();
    expect(notificationHistoryService.count()).toBe(0);
    expect(notificationHistoryService.list()).toEqual([]);
  });
});
