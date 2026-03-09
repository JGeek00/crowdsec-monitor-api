import { Sequelize } from 'sequelize';
import { config } from './index';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.database.path,
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
  // Allow multiple concurrent connections so read queries don't serialize
  // behind each other. WAL mode (enabled below) makes this safe for readers.
  pool: {
    max: 5,
    min: 1,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    // Wait up to 30 s when the database is locked before throwing SQLITE_BUSY
    busyTimeout: 30000,
  },
});

export const initDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');

    // Enable WAL mode for better concurrent read/write performance.
    // WAL allows reads while a write is in progress, which is critical
    // when the blocklists sync (large payload) runs alongside normal queries.
    await sequelize.query('PRAGMA journal_mode=WAL;');
    console.log('✓ SQLite WAL mode enabled.');

    // Ensure SQLite waits up to 30 s instead of failing immediately when locked.
    // This is set both via dialectOptions (per-connection) and PRAGMA (belt-and-braces).
    await sequelize.query('PRAGMA busy_timeout = 30000;');
    console.log('✓ SQLite busy_timeout set to 30 s.');

    // Reduce the auto-checkpoint threshold so the WAL file is compacted more
    // aggressively. Default is 1000 pages; 200 keeps the WAL small and prevents
    // reads from slowing down due to large WAL frame scans.
    await sequelize.query('PRAGMA wal_autocheckpoint = 200;');
    console.log('✓ SQLite wal_autocheckpoint set to 200 pages.');

    // Index on blocklist_ips.blocklist_id — without this SQLite does a full
    // table scan (113k+ rows) on every detail/paginated IPs query.
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_blocklist_ips_blocklist_id ON blocklist_ips (blocklist_id);'
    );
    console.log('✓ Index on blocklist_ips.blocklist_id ensured.');

    // Sync all models - creates tables if they don't exist, but doesn't modify existing ones
    await sequelize.sync();
    console.log('✓ Database models synchronized.');
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    throw error;
  }
};
