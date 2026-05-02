import fs from 'fs';
import path from 'path';
import { MigrationService } from '@/services/migrations/migration.service';
import type { Migration } from '@/types/migration.types';
import { Sequelize } from 'sequelize';

/**
 * Load and execute a migration file as a TypeScript module
 */
function loadMigration(filePath: string): Migration {
  try {
    const module = require(filePath);
    return module.default || module;
  } catch (error) {
    console.error(`Error loading migration from ${filePath}:`, error);
    throw error;
  }
}

/**
 * MigrationRunner - Automatically discovers and executes database migrations
 * from the src/migrations/ directory in numeric order.
 */
export class MigrationRunner {
  private migrationsCache: Map<string, Migration> = new Map();
  private migrationsDir: string;

  constructor(
    private migrationService: MigrationService,
    private sequelize: Sequelize
  ) {
    const projectRoot = path.resolve(__dirname, '../../..');
    this.migrationsDir = path.join(projectRoot, 'dist/migrations');
  }

  /**
   * Main function to run all pending migrations
   */
  async run(): Promise<void> {
    console.log('🔍 Starting database migrations...');

    try {
      const migrationNames = await this.loadMigrations();

      if (migrationNames.length === 0) {
        console.log('ℹ️ No migrations found in src/migrations/');
        return;
      }

      console.log(`📦 Found ${migrationNames.length} migration(s) in filesystem`);

      const appliedNames = await this.migrationService.getAppliedMigrations();

      if (appliedNames.length > 0) {
        console.log(`✅ ${appliedNames.length} migration(s) already applied`);
      }

      const pendingNames = await this.migrationService.getPendingMigrations(migrationNames);

      if (pendingNames.length === 0) {
        console.log('✨ All migrations are up to date');
        return;
      }

      console.log(`⏳ ${pendingNames.length} migration(s) pending execution`);

      for (const migrationName of pendingNames) {
        await this.executeMigration(migrationName);
      }

      console.log('✅ Database migrations completed successfully');
    } catch (error) {
      console.error('❌ Database migrations failed:', error);
      throw error;
    }
  }

  /**
     * Load all migrations from src/migrations/ directory
     */
  private loadMigrations(): string[] {
    if (!fs.existsSync(this.migrationsDir)) {
      console.warn(`⚠️ Migrations directory not found: ${this.migrationsDir}`);
      return [];
    }

    const files = fs.readdirSync(this.migrationsDir);
    const migrationFiles = files.filter((file) => /.*\.js$/.test(file));

    const migrationNames = migrationFiles
      .map((file) => {
        const match = file.match(/^(\d+)_/);
        if (!match) return null;
        return { name: file, prefix: match[1] };
      })
      .filter((item): item is { name: string; prefix: string } => item !== null);

    migrationNames.sort((a, b) => parseInt(a.prefix, 10) - parseInt(b.prefix, 10));

    for (const { name } of migrationNames) {
      try {
        const migrationPath = path.join(this.migrationsDir, name);
        const migrationName = this.getMigrationName(name);

        const migration = loadMigration(migrationPath);

        this.migrationsCache.set(migrationName, migration);
      } catch (error) {
        console.error(`⚠️ Failed to load migration ${name}:`, error);
      }
    }

    return migrationNames.map((m) => this.getMigrationName(m.name));
  }

  /**
    * Get the migration name without extension
    */
  private getMigrationName(filename: string): string {
    return filename.replace(/\.js$/, '');
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migrationName: string): Promise<void> {
    console.log(`\n🔄 Executing migration: ${migrationName}`);

    try {
      const migration = this.migrationsCache.get(migrationName);

      if (!migration) {
        throw new Error(`Migration not found: ${migrationName}`);
      }

      await migration.up({});

      await this.migrationService.registerMigration(migrationName);

      console.log(`✅ Migration ${migrationName} applied successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migrationName} failed:`, error);
      throw error;
    }
  }
}
