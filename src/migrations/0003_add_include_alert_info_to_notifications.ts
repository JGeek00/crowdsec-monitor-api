import { sequelize } from '@/config/database';

/**
 * Migration 0003: add include_alert_info to notifications table.
 *
 * Per-notification opt-in for appending triggered alert information to the
 * message body (only for providers that support it).
 */

export default {
  name: '0003_add_include_alert_info_to_notifications',
  up: async () => {
    try {
      await sequelize.query(`
        ALTER TABLE notifications
        ADD COLUMN include_alert_info BOOLEAN NOT NULL DEFAULT FALSE
      `);
    } catch (error: unknown) {
      const err = error as {
        parent?: { errno?: number; code?: string; message?: string };
        message?: string;
        code?: string;
      };
      if (
        // SQLite: duplicate column name
        (err?.parent?.errno === 1 && err?.parent?.message?.includes('duplicate column name')) ||
        err?.message?.includes('duplicate column name') ||
        err?.code === 'SQLITE_ERROR' ||
        // PostgreSQL: duplicate column
        err?.parent?.code === '42701' ||
        err?.message?.includes('already exists')
      ) {
        return;
      }
      throw error;
    }
  },
  down: async () => {
    await sequelize
      .query(
        `
      ALTER TABLE notifications
      DROP COLUMN include_alert_info
    `,
      )
      .catch(() => {});
  },
};
