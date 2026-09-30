import type { NotificationHistoryEntry } from '@/models';

const MAX_ENTRIES = 200;

class NotificationHistoryService {
  private entries: NotificationHistoryEntry[] = [];
  private counter = 0;

  list(): NotificationHistoryEntry[] {
    return [...this.entries].reverse();
  }

  clear(): void {
    this.entries = [];
  }

  push(entry: Omit<NotificationHistoryEntry, 'id' | 'triggeredAt'>): NotificationHistoryEntry {
    this.counter += 1;
    const full: NotificationHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${this.counter}`,
      triggeredAt: new Date().toISOString(),
    };
    this.entries.push(full);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.splice(0, this.entries.length - MAX_ENTRIES);
    }
    return full;
  }

  count(): number {
    return this.entries.length;
  }
}

export const notificationHistoryService = new NotificationHistoryService();
