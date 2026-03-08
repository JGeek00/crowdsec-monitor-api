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
    
    // Sync all models - creates tables if they don't exist, but doesn't modify existing ones
    await sequelize.sync();
    console.log('✓ Database models synchronized.');
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    throw error;
  }
};
