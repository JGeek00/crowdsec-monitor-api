import { sequelize } from '@/config/database';

/**
 * Migration 0002: create notification channels and notifications tables.
 * Unreleased feature: this migration is the single source for both tables.
 */

export default {
  name: '0002_create_notifications',
  up: async () => {
    await sequelize
      .query(
        `
      CREATE TABLE IF NOT EXISTS notification_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(120) NOT NULL,
        type VARCHAR(20) NOT NULL,
        config JSON NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
      )
      .catch(() => {});
    await sequelize
      .query(
        `
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(120) NOT NULL,
        description VARCHAR(500),
        enabled BOOLEAN NOT NULL DEFAULT 1,
        condition JSON NOT NULL,
        threshold JSON,
        message TEXT NOT NULL,
        channel_ids JSON NOT NULL DEFAULT '[]',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
      )
      .catch(() => {});
    await sequelize
      .query(`CREATE INDEX IF NOT EXISTS idx_notifications_enabled ON notifications (enabled)`)
      .catch(() => {});
  },
  down: async () => {
    await sequelize.query(`DROP TABLE IF EXISTS notifications`).catch(() => {});
    await sequelize.query(`DROP TABLE IF EXISTS notification_channels`).catch(() => {});
  },
};
