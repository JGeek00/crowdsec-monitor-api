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
});

export const initDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');
    
    // Sync all models - creates tables if they don't exist, but doesn't modify existing ones
    await sequelize.sync();
    console.log('✓ Database models synchronized.');
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    throw error;
  }
};
