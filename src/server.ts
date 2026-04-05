import { config } from '@/config';
import { initDatabase } from '@/config/database';
import { createApp } from '@/app';
import { databaseService, schedulerService, versionCheckerService } from '@/services';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import packageJson from '../package.json';

/**
 * Validate required environment variables
 */
const validateEnvironment = (): void => {
  const requiredVars = [
    { name: 'CROWDSEC_LAPI_URL', value: config.crowdsec.lapiUrl },
    { name: 'CROWDSEC_USER', value: config.crowdsec.user },
    { name: 'CROWDSEC_PASSWORD', value: config.crowdsec.password },
    { name: 'CROWDSEC_BOUNCER_KEY', value: config.crowdsec.bouncerKey },
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
    console.error('See README.md for deployment instructions.');
    console.error('');
    process.exit(1);
  }
};

const formatInterval = (seconds: number): string => {
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
};

const step = (label: string, status: '✓' | '⚠' | '✗', detail?: string): void => {
  const paddedLabel = label.padEnd(36, '.');
  const suffix = detail ? ` (${detail})` : '';
  console.log(`  ${paddedLabel} ${status}${suffix}`);
};

const startServer = async (): Promise<void> => {
  try {
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log(`  ║   CrowdSec Monitor API  v${packageJson.version.padEnd(12)}║`);
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');

    // Validate environment variables first
    validateEnvironment();
    step('Environment', '✓');

    // Initialize database
    await initDatabase();
    step('Database', '✓', config.database.mode);

    // Test CrowdSec connection
    const isConnected = await crowdSecAPI.testConnection();
    if (!isConnected) {
      step('CrowdSec LAPI', '⚠', 'unreachable — check config');
    } else {
      step('CrowdSec LAPI', '✓', config.crowdsec.lapiUrl);
    }

    // Verify bouncer API key (CROWDSEC_BOUNCER_KEY) by requesting active decisions
    await crowdSecAPI.checkBouncerConnection();
    step('Bouncer key', '✓');

    // Initial data sync
    if (isConnected) {
      await databaseService.syncAll();
      step('Initial data sync', '✓');
    }

    // Setup schedulers
    schedulerService.schedule(
      'data-sync',
      async () => { await databaseService.syncAll(); },
      { intervalSeconds: config.sync.intervalSeconds, runImmediately: false }
    );

    schedulerService.schedule(
      'version-check',
      async () => { await versionCheckerService.checkForNewVersion(); },
      { intervalSeconds: 3600, runImmediately: true }
    );

    schedulerService.schedule(
      'blocklists-sync',
      async () => { await databaseService.syncBlocklists(); },
      { intervalSeconds: config.blocklists.refreshTimeSeconds, runImmediately: true }
    );

    schedulerService.schedule(
      'cs-blocklists-sync',
      async () => { await databaseService.syncCsBlocklists(); },
      { intervalSeconds: config.crowdsecBlocklists.refreshTimeSeconds, runImmediately: true }
    );

    schedulerService.schedule(
      'blocklist-reconcile',
      async () => { await databaseService.reconcileBlocklistIps(); },
      { intervalSeconds: config.blocklistReconcile.intervalSeconds, runImmediately: false }
    );

    console.log('');
    console.log('  Schedulers:');
    console.log(`    ↻ Alerts sync            every ${formatInterval(config.sync.intervalSeconds)}`);
    console.log(`    ↻ Blocklists sync        every ${formatInterval(config.blocklists.refreshTimeSeconds)}`);
    console.log(`    ↻ CS blocklists sync     every ${formatInterval(config.crowdsecBlocklists.refreshTimeSeconds)}`);
    console.log(`    ↻ Blocklist reconcile    every ${formatInterval(config.blocklistReconcile.intervalSeconds)}`);
    console.log(`    ↻ Version check          every 1h`);

    // Create and start Express app
    const app = createApp();

    app.listen(config.server.port, () => {
      console.log('');
      console.log('  ┌─────────────────────────────────────┐');
      console.log('  │  Server ready                       │');
      console.log(`  │  Port:        ${String(config.server.port).padEnd(22)}│`);
      console.log(`  │  Environment: ${config.server.nodeEnv.padEnd(22)}│`);
      console.log(`  │  API:         http://localhost:${config.server.port}/api │`);
      console.log('  └─────────────────────────────────────┘');
      console.log('');
    });
  } catch (error) {
    console.error('');
    console.error('  ✗ Failed to start server:', error);
    console.error('');
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  schedulerService.stopAll();
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  schedulerService.stopAll();
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n  Shutting down gracefully (SIGTERM)...');
  schedulerService.stopAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n  Shutting down gracefully (SIGINT)...');
  schedulerService.stopAll();
  process.exit(0);
});

// Start the server
startServer();
