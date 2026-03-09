import { Sequelize } from 'sequelize';
import { config } from './index';

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

  // Create tables that don't exist yet without modifying existing ones.
  await sequelize.sync();
  console.log('✓ Database models synchronized.');

  // Create indexes after sync() so all tables are guaranteed to exist.
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS idx_blocklist_ips_blocklist_id ON blocklist_ips (blocklist_id);'
  );
  console.log('✓ Index on blocklist_ips.blocklist_id ensured.');
}

async function initPostgres(): Promise<void> {
  // Create tables that don't exist yet without modifying existing ones.
  await sequelize.sync();
  console.log('✓ Database models synchronized.');
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
