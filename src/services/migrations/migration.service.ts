import { sequelize } from '@/config/database';
import { QueryTypes } from 'sequelize';

export class MigrationService {
  /**
   * Check if a migration has already been applied
   */
  async isMigrationApplied(migrationName: string): Promise<boolean> {
    const result = await sequelize.query<{ id: number }>(
      'SELECT COUNT(*) as id FROM migrations WHERE name = ?',
      { replacements: [migrationName], type: QueryTypes.SELECT }
    );
    return result[0]?.id > 0;
  }

  /**
   * Register a migration as applied
   */
  async registerMigration(migrationName: string): Promise<void> {
    await sequelize.query(
      'INSERT INTO migrations (name, applied_at) VALUES (?, ?)',
      { replacements: [migrationName, new Date()], type: QueryTypes.INSERT }
    );
  }

  /**
   * Get list of all applied migrations
   */
  async getAppliedMigrations(): Promise<string[]> {
    const rows = await sequelize.query<{ name: string }>(
      'SELECT name FROM migrations ORDER BY id',
      { type: QueryTypes.SELECT }
    );
    return rows.map((row): string => row.name);
  }

  /**
   * Get list of pending migrations (not yet applied)
   */
  async getPendingMigrations(migrationNames: string[]): Promise<string[]> {
    const applied = await this.getAppliedMigrations();
    return migrationNames.filter((name) => !applied.includes(name));
  }

  /**
   * Get list of failed migrations
   */
  async getFailedMigrations(): Promise<string[]> {
    // Failed migrations are not persisted, return empty array
    return [];
  }
}
