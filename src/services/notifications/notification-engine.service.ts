import { NotificationChannelsTable, NotificationsTable } from '@/models';
import type { ConditionNode, NotificationChannelRef, UserNotification, UserNotificationChannel } from '@/models';
import { evaluateCondition, type AlertLike } from '@/utils/notification-condition';
import { resolveCooldownSeconds } from '@/helpers/notifications/threshold-defaults.helper';
import { dispatchChannels } from '@/services/notifications/notification-sender.service';
import { notificationHistoryService } from '@/services/notifications/notification-history.service';
import { log } from '@/services/log.service';

function safeEvaluate(alert: AlertLike, condition: ConditionNode): boolean {
  try {
    return evaluateCondition(alert, condition);
  } catch {
    return false;
  }
}

function toAlertLike(raw: {
  scenario: string;
  source: AlertLike['source'];
  origin?: string;
  alertType?: string;
}): AlertLike {
  return { scenario: raw.scenario, source: raw.source, origin: raw.origin, alertType: raw.alertType };
}

interface WindowHit {
  t: number;
  alertId?: number;
}

class NotificationEngineService {
  private enabledCache: UserNotification[] = [];
  private channelsCache = new Map<number, UserNotificationChannel>();
  private hitsByNotification = new Map<number, WindowHit[]>();
  private lastSentByNotification = new Map<number, number>();

  snapshotEnabled(): UserNotification[] {
    return [...this.enabledCache];
  }

  async reload(): Promise<void> {
    const [notifications, channels] = await Promise.all([
      NotificationsTable.findAll({ where: { enabled: true } }),
      NotificationChannelsTable.findAll(),
    ]);
    this.enabledCache = notifications.map((r) => r.get({ plain: true }) as UserNotification);
    this.channelsCache = new Map(
      channels.map((r) => {
        const plain = r.get({ plain: true }) as UserNotificationChannel;
        return [plain.id, plain] as const;
      }),
    );
    for (const cached of this.enabledCache) {
      if (!this.hitsByNotification.has(cached.id)) this.hitsByNotification.set(cached.id, []);
    }
    for (const id of [...this.hitsByNotification.keys()]) {
      if (!this.enabledCache.some((n) => n.id === id)) this.hitsByNotification.delete(id);
    }
    for (const id of [...this.lastSentByNotification.keys()]) {
      if (!this.enabledCache.some((n) => n.id === id)) this.lastSentByNotification.delete(id);
    }
    log.info(
      `[notifications] loaded ${String(this.enabledCache.length)} enabled notification(s), ${String(this.channelsCache.size)} channel(s)`,
    );
  }

  upsertCache(notification: UserNotification): void {
    this.removeFromCache(notification.id);
    if (notification.enabled) this.enabledCache.push(notification);
  }

  removeFromCache(id: number): void {
    this.enabledCache = this.enabledCache.filter((n) => n.id !== id);
    this.hitsByNotification.delete(id);
    this.lastSentByNotification.delete(id);
  }

  upsertChannelCache(channel: UserNotificationChannel): void {
    this.channelsCache.set(channel.id, channel);
  }

  removeChannelCache(id: number): void {
    this.channelsCache.delete(id);
  }

  /** Window hit with the alert id that produced it, so triggers can be traced back. */
  private thresholdMet(
    notification: UserNotification,
    now: number,
    alertId?: number,
  ): { fired: boolean; alertIds: number[] } {
    if (!notification.threshold) return { fired: true, alertIds: alertId !== undefined ? [alertId] : [] };
    const { count, windowSeconds } = notification.threshold;
    const cooldownSeconds = resolveCooldownSeconds(notification.threshold);
    const windowStart = now - windowSeconds * 1000;
    const hits = (this.hitsByNotification.get(notification.id) ?? []).filter((h) => h.t >= windowStart);
    hits.push({ t: now, alertId });
    this.hitsByNotification.set(notification.id, hits);
    if (hits.length < count) return { fired: false, alertIds: [] };
    const lastSent = this.lastSentByNotification.get(notification.id);
    if (lastSent !== undefined && now - lastSent < cooldownSeconds * 1000) return { fired: false, alertIds: [] };
    const alertIds = hits.map((h) => h.alertId).filter((id): id is number => id !== undefined);
    this.lastSentByNotification.set(notification.id, now);
    this.hitsByNotification.set(notification.id, []);
    return { fired: true, alertIds };
  }

  async handleAlert(raw: {
    alertId?: number;
    scenario: string;
    source: AlertLike['source'];
    origin?: string;
    alertType?: string;
  }): Promise<void> {
    if (this.enabledCache.length === 0) return;
    const alert = toAlertLike(raw);
    const now = Date.now();
    for (const notification of this.enabledCache) {
      const matches = safeEvaluate(alert, notification.condition);
      if (!matches) continue;
      const { fired, alertIds } = this.thresholdMet(notification, now, raw.alertId);
      if (!fired) continue;
      const missingIds = new Set<number>();
      const refs: NotificationChannelRef[] = notification.channelIds.map((id) => {
        const channel = this.channelsCache.get(id);
        if (!channel) {
          missingIds.add(id);
          return { type: 'ntfy', config: { topic: '' } };
        }
        return { type: channel.type, config: channel.config };
      });
      const channels = await dispatchChannels(refs, notification.message, notification.name);
      const withMissing = channels.map((result, index) => {
        const id = notification.channelIds[index];
        if (id !== undefined && missingIds.has(id)) {
          return { ...result, type: 'unknown', ok: false, detail: `channel ${String(id)} not found` };
        }
        return result;
      });
      notificationHistoryService.push({
        notificationId: notification.id,
        notificationName: notification.name,
        message: notification.message,
        alertIds,
        channels: withMissing,
      });
      log.info(`[notifications] "${notification.name}" triggered`);
    }
  }
}

export const notificationEngineService = new NotificationEngineService();
