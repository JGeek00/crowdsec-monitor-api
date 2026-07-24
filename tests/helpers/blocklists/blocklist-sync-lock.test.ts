import { describe, it, expect, vi } from 'vitest';

describe('AsyncWriteLock', () => {
  it('executes functions sequentially', async () => {
    const { AsyncWriteLock } = await import('@/helpers/blocklists/blocklist-sync-lock');
    const lock = new AsyncWriteLock();
    const order: number[] = [];

    const p1 = lock.acquire(async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push(1);
    });
    const p2 = lock.acquire(async () => {
      order.push(2);
    });

    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });

  it('returns the function result', async () => {
    const { AsyncWriteLock } = await import('@/helpers/blocklists/blocklist-sync-lock');
    const lock = new AsyncWriteLock();

    const result = await lock.acquire(async () => 42);
    expect(result).toBe(42);
  });

  it('handles errors without breaking subsequent calls', async () => {
    const { AsyncWriteLock } = await import('@/helpers/blocklists/blocklist-sync-lock');
    const lock = new AsyncWriteLock();
    const later = vi.fn();

    await lock
      .acquire(async () => {
        throw new Error('boom');
      })
      .catch(() => {});
    await lock.acquire(async () => {
      later();
    });

    expect(later).toHaveBeenCalled();
  });
});
