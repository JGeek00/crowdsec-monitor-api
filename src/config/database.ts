import { Sequelize } from 'sequelize';
import { config } from '@/config/index';

function createSequelize(): Sequelize {
  if (config.database.mode === 'postgres') {
    return new Sequelize({
      dialect: 'postgres',
      host: config.database.postgres.host,
      port: config.database.postgres.port,
      username: config.database.postgres.user,
      password: config.database.postgres.password,
      database: config.database.postgres.database,
      logging: false,
      define: {
        timestamps: true,
        underscored: true,
      },
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
      },
    });
  }

  // SQLite
  return new Sequelize({
    dialect: 'sqlite',
    storage: config.database.path,
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      busyTimeout: 30000,
    },
  });
}

export const sequelize = createSequelize();

async function initSQLite(): Promise<void> {
  // Configure connection pragmas before syncing models.
  await sequelize.query('PRAGMA journal_mode=WAL;');
  console.log('✓ SQLite WAL mode enabled.');

  await sequelize.query('PRAGMA busy_timeout = 30000;');
  console.log('✓ SQLite busy_timeout set to 30 s.');

  await sequelize.query('PRAGMA wal_autocheckpoint = 200;');
  console.log('✓ SQLite wal_autocheckpoint set to 200 pages.');

  // One-time migration: if the old 'lists' table exists, drop it along with
  // 'blocklist_ips' so they get recreated with the new schema.
  const [oldLists] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='lists'"
  );
  if ((oldLists as any[]).length > 0) {
    console.log('⚙️  Migrating old blocklist tables to new schema...');
    await sequelize.query('DROP TABLE IF EXISTS blocklist_ips');
    await sequelize.query('DROP TABLE IF EXISTS lists');
    console.log('✓ Old blocklist tables dropped.');
  }

  // Migration: drop cs_blocklists so sync() recreates it with the new VARCHAR(50) id column.
  // FK-referencing rows in blocklist_ips are deleted first.
  await sequelize.query('DELETE FROM blocklist_ips WHERE cs_blocklist_id IS NOT NULL;').catch(() => {});
  await sequelize.query('DROP TABLE IF EXISTS cs_blocklists;').catch(() => {});
  console.log('✓ cs_blocklists dropped (will be recreated with VARCHAR id and re-synced on startup).');

  // Create tables that don't exist yet without modifying existing ones.
  await sequelize.sync();
  console.log('✓ Database models synchronized.');

  // Add 'enabled' column to blocklists if it was created before this field existed.
  await sequelize.query(
    'ALTER TABLE blocklists ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT 1;'
  ).catch(() => { /* column already exists — safe to ignore */ });

  // Add 'active' column to blocklist_ips if it was created before this field existed.
  await sequelize.query(
    'ALTER TABLE blocklist_ips ADD COLUMN active BOOLEAN NOT NULL DEFAULT 1;'
  ).catch(() => { /* column already exists — safe to ignore */ });

  // Create indexes after sync() so all tables are guaranteed to exist.
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS idx_blocklist_ips_blocklist_id ON blocklist_ips (blocklist_id);'
  );
  console.log('✓ Index on blocklist_ips.blocklist_id ensured.');
}

async function initPostgres(): Promise<void> {
  // One-time migration: if the old 'lists' table exists, drop it along with
  // 'blocklist_ips' so they get recreated with the new schema.
  const [oldLists] = await sequelize.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='lists'"
  );
  if ((oldLists as any[]).length > 0) {
    console.log('⚙️  Migrating old blocklist tables to new schema...');
    await sequelize.query('DROP TABLE IF EXISTS blocklist_ips');
    await sequelize.query('DROP TABLE IF EXISTS lists');
    console.log('✓ Old blocklist tables dropped.');
  }

  // Migration: change cs_blocklists.id and blocklist_ips.cs_blocklist_id from INTEGER to VARCHAR(50).
  // Delete FK-referencing rows, drop the FK constraint, then alter both columns.
  await sequelize.query('DELETE FROM blocklist_ips WHERE cs_blocklist_id IS NOT NULL;').catch(() => {});
  await sequelize.query('DELETE FROM cs_blocklists;').catch(() => {});
  await sequelize.query('ALTER TABLE blocklist_ips DROP CONSTRAINT IF EXISTS blocklist_ips_cs_blocklist_id_fkey;').catch(() => {});
  await sequelize.query('ALTER TABLE cs_blocklists ALTER COLUMN id TYPE VARCHAR(50) USING id::text;').catch(() => {});
  await sequelize.query('ALTER TABLE blocklist_ips ALTER COLUMN cs_blocklist_id TYPE VARCHAR(50) USING cs_blocklist_id::text;').catch(() => {});
  console.log('✓ cs_blocklists schema migrated to VARCHAR id (will be re-synced on startup).');

  // Create tables that don't exist yet without modifying existing ones.
  await sequelize.sync();
  console.log('✓ Database models synchronized.');

  // Add 'enabled' column to blocklists if it was created before this field existed.
  await sequelize.query(
    'ALTER TABLE blocklists ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;'
  ).catch(() => { /* ignore if already exists */ });

  // Add 'active' column to blocklist_ips if it was created before this field existed.
  await sequelize.query(
    'ALTER TABLE blocklist_ips ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;'
  ).catch(() => { /* ignore if already exists */ });
}

export const initDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');

    if (config.database.mode === 'sqlite') {
      await initSQLite();
    } else {
      await initPostgres();
    }
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    throw error;
  }
};
