import fs from 'fs';
import path from 'path';
import { Migration } from '@/infrastructure/persistence/sequelize/models/Migration';
import { MigrationService } from '@/infrastructure/persistence/sequelize/migrations-legacy/migration.service';
import { MigrationTask } from '@/infrastructure/persistence/sequelize/migrations-legacy/migration-task.types';
import { log } from '@/infrastructure/system/logger';
import { config } from '@/config/index';
import { sequelize } from '@/config/database';
import { DB_MODE } from '@/config/db-mode.types';

/**
 * Load and execute a migration file as a TypeScript module
 */
function loadMigration(filePath: string): MigrationTask {
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
 * from the infrastructure/persistence/sequelize/migrations/ directory in numeric order.
 */
export class MigrationRunner {
  private migrationsCache: Map<string, MigrationTask> = new Map();
  private migrationsDir: string;

  constructor(private migrationService: MigrationService) {
    // Compiled migrations live next to this file: dist/infrastructure/persistence/sequelize/migrations.
    // Under tsx (`pnpm dev`) the directory holds .ts sources instead — both are discovered
    // so dev and prod apply the same migrations.
    this.migrationsDir = path.resolve(__dirname, '../migrations');
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
   * Check if the migrations table already exists in the database.
   * Returns false for a brand new database (table created only by sync).
   * Used to distinguish between:
   *  - Old version (no migrations table) → run migrations normally
   *  - Fresh database (table exists but empty via sync) → skip, register all as applied
   */
  private async migrationsTableExists(): Promise<boolean> {
    if (config.database.mode === DB_MODE.POSTGRES) {
      const [result] = await sequelize.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'migrations') AS table_exists",
      );
      return (result as { table_exists: boolean }[])[0]?.table_exists ?? false;
    } else {
      const [result] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'");
      return (result as unknown[]).length > 0;
    }
  }

  /**
   * Main function to run all pending migrations
   */
  async run(): Promise<void> {
    log.info('Starting database migrations...');

    try {
      const migrationNames = this.loadMigrations();

      if (migrationNames.length === 0) {
        log.info('No migrations found in the migrations directory');
        return;
      }

      log.info(`Found ${migrationNames.length} migration(s) in filesystem`);

      // Determine database state based on migrations table existence
      const tableExists = await this.migrationsTableExists();

      if (!tableExists) {
        // Old version without migration system — run migrations normally.
        // Migrations may create the table themselves (e.g., migration 0001).
        log.info('No migrations table found — running migrations from scratch.');
        await this.ensureMigrationsTable();
        const pendingNames = await this.migrationService.getPendingMigrations(migrationNames);
        for (const migrationName of pendingNames) {
          await this.executeMigration(migrationName);
        }
        log.info('Database migrations completed successfully');
        return;
      }

      // Table exists — ensure it's properly synced
      await this.ensureMigrationsTable();
      const appliedNames = await this.migrationService.getAppliedMigrations();

      if (appliedNames.length === 0) {
        // Fresh database: sync() already created the latest schema.
        // Register all migrations as applied without executing them.
        log.info(
          'Fresh database detected — schema already up to date via sync(). Registering all migrations as applied.',
        );
        for (const migrationName of migrationNames) {
          await this.migrationService.registerMigration(migrationName);
          log.info(`Migration ${migrationName} registered as applied (skipped)`);
        }
        log.info('Database migrations completed successfully');
        return;
      }

      log.info(`${appliedNames.length} migration(s) already applied`);

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
   * Load all migrations from the migrations directory
   */
  private loadMigrations(): string[] {
    if (!fs.existsSync(this.migrationsDir)) {
      log.warn(`Migrations directory not found: ${this.migrationsDir}`);
      return [];
    }

    const files = fs.readdirSync(this.migrationsDir);
    const migrationFiles = files.filter((file) => /\.(js|ts)$/.test(file) && !file.endsWith('.d.ts'));

    const entries = migrationFiles
      .map((file) => {
        const match = file.match(/^(\d+)_/);
        if (!match) return null;
        return { file, name: this.getMigrationName(file), prefix: match[1], compiled: file.endsWith('.js') };
      })
      .filter((item): item is { file: string; name: string; prefix: string; compiled: boolean } => item !== null);

    // Numeric order; prefer the compiled .js when both flavours of a migration exist.
    entries.sort((a, b) => parseInt(a.prefix, 10) - parseInt(b.prefix, 10) || Number(b.compiled) - Number(a.compiled));

    const ordered: { file: string; name: string }[] = [];
    const seen = new Set<string>();
    for (const { file, name } of entries) {
      if (seen.has(name)) continue;
      seen.add(name);
      try {
        const migration = loadMigration(path.join(this.migrationsDir, file));

        this.migrationsCache.set(name, migration);
      } catch (err) {
        log.error(`Failed to load migration ${file}:`, err);
      }
      ordered.push({ file, name });
    }

    return ordered.map((m) => m.name);
  }

  /**
   * Get the migration name without extension (.js in dist, .ts under tsx)
   */
  private getMigrationName(filename: string): string {
    return filename.replace(/\.(js|ts)$/, '');
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

      await migration.up();

      await this.migrationService.registerMigration(migrationName);

      log.info(`Migration ${migrationName} applied successfully`);
    } catch (err) {
      log.error(`Migration ${migrationName} failed:`, err);
      throw err;
    }
  }
}
