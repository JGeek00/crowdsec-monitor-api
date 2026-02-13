import cron from 'node-cron';
import { config } from './config';
import { initDatabase } from './config/database';
import { createApp } from './app';
import { databaseService } from './services/database.service';
import { crowdSecAPI } from './services/crowdsec-api.service';

/**
 * Validate required environment variables
 */
const validateEnvironment = (): void => {
  const requiredVars = [
    { name: 'CROWDSEC_LAPI_URL', value: config.crowdsec.lapiUrl },
    { name: 'CROWDSEC_USER', value: config.crowdsec.user },
    { name: 'CROWDSEC_PASSWORD', value: config.crowdsec.password },
  ];

  const missingVars: string[] = [];

  for (const { name, value } of requiredVars) {
    if (!value || value.trim() === '') {
      missingVars.push(name);
    }
  }

  if (missingVars.length > 0) {
    console.error('');
    console.error('❌ ERROR: Missing required environment variables:');
    console.error('');
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('');
    console.error('Please configure these variables in your .env file.');
    console.error('See .env.example for reference.');
    console.error('');
    process.exit(1);
  }
};

const startServer = async (): Promise<void> => {
  try {
    // Validate environment variables first
    console.log('Validating environment configuration...');
    validateEnvironment();
    console.log('✓ Environment configuration valid');

    // Initialize database
    console.log('Initializing database...');
    await initDatabase();

    // Test CrowdSec connection
    console.log('Testing CrowdSec LAPI connection...');
    const isConnected = await crowdSecAPI.testConnection();
    if (!isConnected) {
      console.warn('⚠ Warning: Unable to connect to CrowdSec LAPI. Please check your configuration.');
    } else {
      console.log('✓ CrowdSec LAPI connection successful');
    }

    // Initial data sync
    if (isConnected) {
      console.log('Performing initial data sync...');
      await databaseService.syncAll();
    }

    // Setup cron job for periodic sync
    console.log(`Setting up automatic sync (schedule: ${config.sync.schedule})...`);
    cron.schedule(config.sync.schedule, async () => {
      console.log('Running scheduled sync...');
      await databaseService.syncAll();
    });

    // Create and start Express app
    const app = createApp();
    
    app.listen(config.server.port, () => {
      console.log('=================================');
      console.log(`✓ Server running on port ${config.server.port}`);
      console.log(`✓ Environment: ${config.server.nodeEnv}`);
      console.log(`✓ API available at: http://localhost:${config.server.port}/api`);
      console.log('=================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();
