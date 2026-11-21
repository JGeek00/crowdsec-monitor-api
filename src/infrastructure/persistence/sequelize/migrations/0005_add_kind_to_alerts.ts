import { sequelize } from '@/config/database';

/**
 * Migration 0005: persist raw LAPI `kind` on alerts.
 *
 * - alerts: kind VARCHAR(32) NULL (raw kind is a free-form LAPI string:
 *   'crowdsec' | 'waf' | 'bot-detection' | 'capi' | 'papi' | 'cscli').
 * - No backfill: pre-migration rows keep NULL and are populated on the next
 *   sync (`existingAlert.update` writes `alert.kind ?? null`). Deriving kind
 *   from scenario markers would conflate waf vs bot-detection.
 */

export default {
  name: '0005_add_kind_to_alerts',
  up: async () => {
    await sequelize.query('ALTER TABLE alerts ADD COLUMN kind VARCHAR(32)').catch(() => {
      /* table missing (fresh installs, sync creates it with the column) or column already exists */
    });
  },
  down: async () => {
    await sequelize.query('ALTER TABLE alerts DROP COLUMN kind').catch(() => {});
  },
};
