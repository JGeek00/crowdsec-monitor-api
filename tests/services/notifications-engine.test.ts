import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import appDefaults from '@/constants/app-defaults';
import { notificationEngineService } from '@/services/notifications/notification-engine.service';
import { notificationHistoryService } from '@/services/notifications/notification-history.service';
import type { UserNotification, UserNotificationChannel } from '@/models';
import { registerNotificationChannel } from '@/services/notifications/notification-sender.service';

registerNotificationChannel('test-ok', async () => null);

function makeNotification(overrides: Partial<UserNotification> = {}): UserNotification {
  return {
    id: 1,
    name: 'ssh-bf ES',
    description: null,
    enabled: true,
    condition: { type: 'leaf', field: 'scenario', operator: 'equals', value: 'crowdsecurity/ssh-bf' },
    threshold: null,
    message: 'SSH brute force detected',
    channelIds: [11],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

const alert = {
  scenario: 'crowdsecurity/ssh-bf',
  source: { ip: '1.2.3.4', value: '1.2.3.4', scope: 'Ip', cn: 'ES' },
  origin: 'crowdsec',
  alertType: 'ban',
};

function seedChannel(id: number): void {
  const channel: UserNotificationChannel = {
    id,
    name: `channel ${String(id)}`,
    type: 'test-ok' as never,
    config: {},
    created_at: new Date(),
    updated_at: new Date(),
  };
  notificationEngineService.upsertChannelCache(channel);
}

beforeEach(() => {
  notificationHistoryService.clear();
  for (const n of notificationEngineService.snapshotEnabled()) {
    notificationEngineService.removeFromCache(n.id);
  }
  notificationEngineService.removeChannelCache(11);
  seedChannel(11);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('notification-engine', () => {
  it('triggers matching alerts and records history', async () => {
    notificationEngineService.upsertCache(makeNotification());
    await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(1);
    expect(notificationHistoryService.list()[0]?.notificationName).toBe('ssh-bf ES');
    expect(notificationHistoryService.list()[0]?.channels).toEqual([{ type: 'test-ok', ok: true, detail: null }]);
  });

  it('records missing channels as failed entries', async () => {
    notificationEngineService.upsertCache(makeNotification({ id: 3, channelIds: [404] }));
    await notificationEngineService.handleAlert(alert);
    const entry = notificationHistoryService.list()[0];
    expect(entry?.channels).toEqual([{ type: 'unknown', ok: false, detail: 'channel 404 not found' }]);
  });

  it('ignores non-matching alerts', async () => {
    notificationEngineService.upsertCache(makeNotification());
    await notificationEngineService.handleAlert({ ...alert, scenario: 'crowdsecurity/http-probing' });
    expect(notificationHistoryService.count()).toBe(0);
  });

  it('does nothing without enabled notifications', async () => {
    await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(0);
  });

  it('removeFromCache stops triggers; disabled upsert is not cached', async () => {
    notificationEngineService.upsertCache(makeNotification({ id: 7 }));
    notificationEngineService.removeFromCache(7);
    await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(0);

    notificationEngineService.upsertCache(makeNotification({ id: 8, enabled: false }));
    expect(notificationEngineService.snapshotEnabled().find((n) => n.id === 8)).toBeUndefined();
  });

  it('honours frequency thresholds (x times in y seconds)', async () => {
    notificationEngineService.upsertCache(
      makeNotification({ id: 9, threshold: { count: 3, windowSeconds: 60 } }),
    );
    await notificationEngineService.handleAlert(alert);
    await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(0);
    await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(1);
  });

  it('fires once for 5 alerts in the window (window-reset + default cooldown)', async () => {
    notificationEngineService.upsertCache(
      makeNotification({ id: 20, threshold: { count: 3, windowSeconds: 10 } }),
    );
    for (let i = 0; i < 5; i++) await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(1);
  });

  it('suppresses a second burst inside cooldown and fires after expiry', async () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    notificationEngineService.upsertCache(
      makeNotification({ id: 21, threshold: { count: 3, windowSeconds: 10, cooldownSeconds: 60 } }),
    );
    for (let i = 0; i < 3; i++) await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(1);
    now += 20_000;
    for (let i = 0; i < 3; i++) await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(1);
    now += 60_000;
    for (let i = 0; i < 3; i++) await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(2);
  });

  it('keeps pipelines independent: one burst fires every matching notification', async () => {
    notificationEngineService.upsertCache(
      makeNotification({ id: 22, name: 'five-in-10s', threshold: { count: 5, windowSeconds: 10 } }),
    );
    notificationEngineService.upsertCache(
      makeNotification({ id: 23, name: 'three-ssh', threshold: { count: 3, windowSeconds: 10 } }),
    );
    for (let i = 0; i < 5; i++) await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(2);
    expect(notificationHistoryService.list().map((e) => e.notificationName).sort()).toEqual([
      'five-in-10s',
      'three-ssh',
    ]);
  });

  it('rate-limits count=1 with cooldown (at most once per cooldown)', async () => {
    let now = 2_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    notificationEngineService.upsertCache(
      makeNotification({ id: 24, threshold: { count: 1, windowSeconds: 10, cooldownSeconds: 60 } }),
    );
    await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(1);
    now += 10_000;
    await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(1);
    now += 60_000;
    await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(2);
  });

  it('applies the service default cooldown when threshold omits it (legacy rows)', async () => {
    const cooldownMs = appDefaults.notifications.defaultCooldownSeconds * 1000;
    let now = 3_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    notificationEngineService.upsertCache(
      makeNotification({ id: 25, threshold: { count: 3, windowSeconds: 10 } }),
    );
    for (let i = 0; i < 3; i++) await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(1);
    now += cooldownMs - 10_000;
    for (let i = 0; i < 3; i++) await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(1);
    now += 10_000;
    for (let i = 0; i < 3; i++) await notificationEngineService.handleAlert(alert);
    expect(notificationHistoryService.count()).toBe(2);
  });
});
