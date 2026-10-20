import appDefaults from '@/constants/app-defaults';
import type { NotificationThreshold } from '@/models';

export function withThresholdDefaults(
  threshold: NotificationThreshold | null | undefined,
): NotificationThreshold | null {
  if (threshold === null || threshold === undefined) return null;
  return {
    ...threshold,
    cooldownSeconds: threshold.cooldownSeconds ?? appDefaults.notifications.defaultCooldownSeconds,
  };
}

export function resolveCooldownSeconds(threshold: NotificationThreshold | null): number {
  if (!threshold) return 0;
  return threshold.cooldownSeconds ?? appDefaults.notifications.defaultCooldownSeconds;
}
