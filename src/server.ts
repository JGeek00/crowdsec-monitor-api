import { config } from './config';
import { initDatabase } from './config/database';
import { createApp } from './app';
import { databaseService, schedulerService } from './services';
import { crowdSecAPI } from './services/crowdsec-api.service';
import packageJson from '../package.json';

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

    // Setup automatic sync with interval-based scheduler
    console.log(`Setting up automatic sync (interval: ${config.sync.intervalSeconds}s)...`);
    schedulerService.schedule(
      async () => {
        console.log('Running scheduled sync...');
        await databaseService.syncAll();
      },
      {
        intervalSeconds: config.sync.intervalSeconds,
        runImmediately: false, // Already ran initial sync
      }
    );

    // Create and start Express app
    const app = createApp();
    
    app.listen(config.server.port, () => {
      console.log('=================================');
      console.log(`✓ Server running on port ${config.server.port}`);
      console.log(`✓ Environment: ${config.server.nodeEnv}`);
      console.log(`✓ Version: ${packageJson.version}`);
      console.log(`✓ API available at: http://localhost:${config.server.port}/api`);
      console.log(`✓ Refreshing data every ${config.sync.intervalSeconds} seconds`);
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
  schedulerService.stop();
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  schedulerService.stop();
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  schedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  schedulerService.stop();
  process.exit(0);
});

// Start the server
startServer();
