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
    await sequelize.query(`
      ALTER TABLE blocklists 
      ADD COLUMN last_refresh_failed BOOLEAN DEFAULT 0
    `);
  },
  down: async () => {
    await sequelize.query(`
      ALTER TABLE blocklists 
      DROP COLUMN last_refresh_failed
    `);
  },
};
