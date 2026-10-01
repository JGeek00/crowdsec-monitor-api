import { describe, expect, it } from 'vitest';
import appDefaults from '@/constants/app-defaults';
import {
  resolveCooldownSeconds,
  withThresholdDefaults,
} from '@/helpers/notifications/threshold-defaults.helper';

describe('threshold-defaults helper', () => {
  it('backfills the service default cooldown when omitted', () => {
    expect(withThresholdDefaults({ count: 3, windowSeconds: 10 })).toEqual({
      count: 3,
      windowSeconds: 10,
      cooldownSeconds: appDefaults.notifications.defaultCooldownSeconds,
    });
  });

  it('keeps an explicit cooldown untouched', () => {
    expect(withThresholdDefaults({ count: 3, windowSeconds: 10, cooldownSeconds: 5 })).toEqual({
      count: 3,
      windowSeconds: 10,
      cooldownSeconds: 5,
    });
  });

  it('passes null through', () => {
    expect(withThresholdDefaults(null)).toBeNull();
    expect(withThresholdDefaults(undefined)).toBeNull();
  });

  it('resolves the default for legacy thresholds without cooldown', () => {
    expect(resolveCooldownSeconds({ count: 3, windowSeconds: 10 })).toBe(
      appDefaults.notifications.defaultCooldownSeconds,
    );
    expect(resolveCooldownSeconds({ count: 3, windowSeconds: 10, cooldownSeconds: 5 })).toBe(5);
    expect(resolveCooldownSeconds(null)).toBe(0);
  });
});
