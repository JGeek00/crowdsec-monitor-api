import { config } from '@/config';
import { initDatabase } from '@/config/database';
import { createApp } from '@/app';
import {
  databaseService,
  schedulerService,
  versionCheckerService,
  statusService,
  statusBlocklistService,
} from '@/services';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { webSocketApp } from '@/sockets';
import appDefaults from '@/constants/app-defaults';
import { setLevel as initLogger, log } from '@/services';
import { LogLevel } from '@/types/log.types';
import packageJson from '../package.json';

/**
 * Validate required environment variables
 */
export const validateEnvironment = (): void => {
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

export const formatInterval = (seconds: number): string => {
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
};

export const step = (label: string, status: '✓' | '⚠' | '✗', detail?: string): void => {
  const paddedLabel = label.padEnd(36, '.');
  const suffix = detail ? ` (${detail})` : '';
  log.info(`  ${paddedLabel} ${status}${suffix}`);
};

const startServer = async (): Promise<void> => {
  try {
    initLogger(config.logs.level as LogLevel);

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
    statusService.updateLapiStatus(isConnected, null);

    // Verify bouncer API key (CROWDSEC_BOUNCER_KEY) by requesting active decisions
    await crowdSecAPI.checkBouncerConnection();
    statusService.updateBouncerStatus(crowdSecAPI.isBouncerConnected());
    step('Bouncer key', '✓');

    // Initial data sync
    if (isConnected) {
      await databaseService.syncAll();
      statusService.updateLapiStatus(isConnected, databaseService.getLastSuccessfulSync()?.toISOString() ?? null);
      step('Initial data sync', '✓');
    }

    // Setup schedulers
    schedulerService.schedule(
      appDefaults.scheduler.lapiCheck,
      async () => {
        await crowdSecAPI.checkStatus();
        statusService.updateLapiStatus(
          crowdSecAPI.getLastLapiConnected(),
          databaseService.getLastSuccessfulSync()?.toISOString() ?? null,
        );
      },
      { intervalSeconds: config.lapiCheck.intervalSeconds, runImmediately: false },
    );

    schedulerService.schedule(
      appDefaults.scheduler.dataSync,
      async () => {
        await databaseService.syncAll();
        statusService.updateLapiStatus(
          crowdSecAPI.getLastLapiConnected(),
          databaseService.getLastSuccessfulSync()?.toISOString() ?? null,
        );
      },
      { intervalSeconds: config.sync.intervalSeconds, runImmediately: false },
    );

    schedulerService.schedule(
      appDefaults.scheduler.versionCheck,
      async () => {
        await versionCheckerService.checkForNewVersion();
        statusService.updateVersionInfo(versionCheckerService.getLatestVersion());
      },
      { intervalSeconds: 3600, runImmediately: true },
    );

    schedulerService.schedule(
      appDefaults.scheduler.blocklistsSync,
      async () => {
        if (statusBlocklistService.isSyncingBlocklists()) {
          log.warn('Blocklists sync skipped: a refresh is already in progress');
          return;
        }
        await databaseService.refreshBlocklists();
      },
      { intervalSeconds: config.blocklists.refreshTimeSeconds, runImmediately: true },
    );

    schedulerService.schedule(
      appDefaults.scheduler.csBlocklistsSync,
      async () => {
        await databaseService.syncCsBlocklists();
      },
      { intervalSeconds: config.crowdsecBlocklists.refreshTimeSeconds, runImmediately: true },
    );

    console.log('');
    log.info('  Schedulers:');
    log.info(`    ↻ LAPI status check       every ${formatInterval(config.lapiCheck.intervalSeconds)}`);
    log.info(`    ↻ Alerts sync            every ${formatInterval(config.sync.intervalSeconds)}`);
    log.info(`    ↻ Blocklists sync        every ${formatInterval(config.blocklists.refreshTimeSeconds)}`);
    log.info(`    ↻ CS blocklists sync     every ${formatInterval(config.crowdsecBlocklists.refreshTimeSeconds)}`);
    log.info(`    ↻ Version check          every 1h`);

    // Create and start Express app
    const app = createApp();

    const server = app.listen(config.server.port, () => {
      console.log('');
      console.log('  ┌─────────────────────────────────────┐');
      console.log('  │  Server ready                       │');
      console.log(`  │  Port:        ${String(config.server.port).padEnd(22)}│`);
      console.log(`  │  Environment: ${config.server.nodeEnv.padEnd(22)}│`);
      console.log(`  │  API:         http://localhost:${config.server.port}/api │`);
      console.log('  └─────────────────────────────────────┘');
      console.log('');
    });

    // Start websocket
    webSocketApp.setup(server);
  } catch (err) {
    console.error('');
    console.error('  ✗ Failed to start server:', err);
    console.error('');
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  schedulerService.stopAll();
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  log.error('Uncaught Exception:', err);
  schedulerService.stopAll();
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log.info('\n  Shutting down gracefully (SIGTERM)...');
  schedulerService.stopAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  log.info('\n  Shutting down gracefully (SIGINT)...');
  schedulerService.stopAll();
  process.exit(0);
});

// Start the server
startServer();
