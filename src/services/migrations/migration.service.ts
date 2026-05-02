import { Migration } from '@/models/Migration';

export class MigrationService {
  /**
   * Check if a migration has already been applied
   */
  async isMigrationApplied(migrationName: string): Promise<boolean> {
    await Migration.ensureInitialized();
    const migration = await Migration.findOne({ where: { name: migrationName } });
    return !!migration;
  }

  /**
   * Register a migration as applied
   */
  async registerMigration(migrationName: string): Promise<void> {
    await Migration.ensureInitialized();
    await Migration.create({
      name: migrationName,
      applied_at: new Date(),
    });
  }

  /**
   * Get list of all applied migrations
   */
  async getAppliedMigrations(): Promise<string[]> {
    await Migration.ensureInitialized();
    const migrations = await Migration.findAll();
    return migrations.map((m) => m.name);
  }

  /**
   * Get list of pending migrations (not yet applied)
   */
  async getPendingMigrations(migrationNames: string[]): Promise<string[]> {
    const applied = await this.getAppliedMigrations();
    return migrationNames.filter((name) => !applied.includes(name));
  }
}
