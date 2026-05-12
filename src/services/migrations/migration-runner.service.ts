import fs from 'fs';
import path from 'path';
import { Migration } from '@/models/db/Migration';
import { MigrationService } from '@/services/migrations/migration.service';
import { log } from '@/services/log.service';

/**
 * Load and execute a migration file as a TypeScript module
 */
function loadMigration(filePath: string): any {
  try {
    const module = require(filePath);
    return module.default || module;
  } catch (err) {
    log.error(`Error loading migration from ${filePath}:`, err);
    throw err;
  }
}

/**
 * MigrationRunner - Automatically discovers and executes database migrations
 * from the src/migrations/ directory in numeric order.
 */
export class MigrationRunner {
  private migrationsCache: Map<string, any> = new Map();
  private migrationsDir: string;

  constructor(
    private migrationService: MigrationService,
  ) {
    const projectRoot = path.resolve(__dirname, '../../..');
    this.migrationsDir = path.join(projectRoot, 'dist/migrations');
  }

  /**
   * Ensure the migrations table exists before running migrations
   */
  private async ensureMigrationsTable(): Promise<void> {
    await Migration.ensureInitialized();
    await Migration.sync({ force: false });
    log.info('Migrations table created/ensured.');
  }

  /**
   * Main function to run all pending migrations
   */
  async run(): Promise<void> {
    await this.ensureMigrationsTable();
    log.info('Starting database migrations...');

    try {
      const migrationNames = this.loadMigrations();

      if (migrationNames.length === 0) {
        log.info('No migrations found in src/migrations/');
        return;
      }

      log.info(`Found ${migrationNames.length} migration(s) in filesystem`);

      const appliedNames = await this.migrationService.getAppliedMigrations();

      if (appliedNames.length > 0) {
        log.info(`${appliedNames.length} migration(s) already applied`);
      }

      const pendingNames = await this.migrationService.getPendingMigrations(migrationNames);

      if (pendingNames.length === 0) {
        log.info('All migrations are up to date');
        return;
      }

      log.info(`${pendingNames.length} migration(s) pending execution`);

      for (const migrationName of pendingNames) {
        await this.executeMigration(migrationName);
      }

      log.info('Database migrations completed successfully');
    } catch (err) {
      log.error('Database migrations failed:', err);
      throw err;
    }
  }

  /**
   * Load all migrations from src/migrations/ directory
   */
  private loadMigrations(): string[] {
    if (!fs.existsSync(this.migrationsDir)) {
      log.warn(`Migrations directory not found: ${this.migrationsDir}`);
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
      } catch (err) {
        log.error(`Failed to load migration ${name}:`, err);
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
    log.info(`Executing migration: ${migrationName}`);

    try {
      const migration = this.migrationsCache.get(migrationName);

      if (!migration) {
        throw new Error(`Migration not found: ${migrationName}`);
      }

      await migration.up({});

      await this.migrationService.registerMigration(migrationName);

      log.info(`Migration ${migrationName} applied successfully`);
    } catch (err) {
      log.error(`Migration ${migrationName} failed:`, err);
      throw err;
    }
  }
}
