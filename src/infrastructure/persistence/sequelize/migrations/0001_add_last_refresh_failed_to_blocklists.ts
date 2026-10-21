import { sequelize } from '@/config/database';

/**
 * Migration 0001: Add last_refresh_failed column to blocklists table
 *
 * This migration adds the `last_refresh_failed` column to the `blocklists` table
 * to track whether the last refresh attempt failed.
 */

export default {
  name: '0001_add_last_refresh_failed_to_blocklists',
  up: async () => {
    await sequelize
      .query(
        `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
      )
      .catch(() => {});

    try {
      await sequelize.query(`
        ALTER TABLE blocklists 
        ADD COLUMN last_refresh_failed BOOLEAN DEFAULT FALSE
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
        console.log('Columna last_refresh_failed ya existe - saltando migración');
        return;
      }
      throw error;
    }
  },
  down: async () => {
    await sequelize
      .query(
        `
      ALTER TABLE blocklists 
      DROP COLUMN last_refresh_failed
    `,
      )
      .catch(() => {});

    await sequelize.query('DROP TABLE IF EXISTS migrations').catch(() => {});
  },
};
