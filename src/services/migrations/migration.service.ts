export class MigrationService {
  private appliedMigrations = new Set<string>();
  private failedMigrations = new Set<string>();

  /**
   * Check if a migration has already been applied
   */
  async isMigrationApplied(migrationName: string): Promise<boolean> {
    return this.appliedMigrations.has(migrationName);
  }

  /**
   * Register a migration as applied
   */
  async registerMigration(migrationName: string): Promise<void> {
    this.appliedMigrations.add(migrationName);
  }

  /**
   * Get list of all applied migrations
   */
  async getAppliedMigrations(): Promise<string[]> {
    return Array.from(this.appliedMigrations);
  }

  /**
   * Get list of pending migrations (not yet applied)
   */
  async getPendingMigrations(migrationNames: string[]): Promise<string[]> {
    return migrationNames.filter((name) => !this.appliedMigrations.has(name));
  }

  /**
   * Get list of failed migrations
   */
  async getFailedMigrations(): Promise<string[]> {
    return Array.from(this.failedMigrations);
  }

  /**
   * Clear migration state (useful for testing)
   */
  clear(): void {
    this.appliedMigrations.clear();
    this.failedMigrations.clear();
  }
}
