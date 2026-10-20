import { config } from '@/config';
import { initDatabase } from '@/config/database';
import { buildApp, buildJobRegistry } from '@/app';
import { databaseService } from '@/infrastructure/persistence/database-facade';
import { schedulerService } from '@/infrastructure/scheduling/interval-scheduler';
import { statusService } from '@/infrastructure/status/monitor-status-store';
import { notificationEngineService } from '@/infrastructure/notifications/engine';
import { log } from '@/infrastructure/system/logger';
import { crowdSecAPI } from '@/infrastructure/crowdsec/lapi/crowdsec-api';
import { webSocketApp } from '@/delivery/websocket/gateway';
import { setLevel as initLogger } from '@/infrastructure/system/logger';
import { LogLevel } from '@/types/log.types';
import { formatInterval } from '@/application/jobs/format-interval';
import packageJson from '../package.json';

// Re-export for backwards compatibility (tests and helpers import it from '@/server').
export { formatInterval };

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

export const step = (label: string, status: '✓' | '⚠' | '✗', detail?: string): void => {
  const paddedLabel = label.padEnd(36, '.');
  const suffix = detail ? ` (${detail})` : '';
  log.info(`  ${paddedLabel} ${status}${suffix}`);
};

/** Bootstrap steps before the HTTP listener starts (legacy order preserved). */
const bootstrap = async (): Promise<void> => {
  initLogger(config.logs.level as LogLevel);

  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log(`  ║   CrowdSec Monitor API  v${packageJson.version.padEnd(12)}║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');

  validateEnvironment();
  step('Environment', '✓');

  await initDatabase();
  step('Database', '✓', config.database.mode);

  const isConnected = await crowdSecAPI.testConnection();
  if (!isConnected) {
    step('CrowdSec LAPI', '⚠', 'unreachable — check config');
  } else {
    step('CrowdSec LAPI', '✓', config.crowdsec.lapiUrl);
  }
  statusService.updateLapiStatus(isConnected, null);

  await crowdSecAPI.checkBouncerConnection();
  statusService.updateBouncerStatus(crowdSecAPI.isBouncerConnected());
  step('Bouncer key', '✓');

  try {
    await notificationEngineService.reload();
    step('Notifications', '✓');
  } catch (err) {
    step('Notifications', '⚠', err instanceof Error ? err.message : 'load failed');
  }

  if (isConnected) {
    await databaseService.syncAll();
    statusService.updateLapiStatus(isConnected, databaseService.getLastSuccessfulSync()?.toISOString() ?? null);
    step('Initial data sync', '✓');
  }
};

const startServer = async (): Promise<void> => {
  try {
    await bootstrap();

    const jobRegistry = buildJobRegistry();
    jobRegistry.startAll();

    console.log('');
    log.info('  Schedulers:');
    log.info(`    ↻ LAPI status check       every ${formatInterval(config.lapiCheck.intervalSeconds)}`);
    log.info(`    ↻ Alerts sync            every ${formatInterval(config.sync.intervalSeconds)}`);
    log.info(`    ↻ Blocklists sync        every ${formatInterval(config.blocklists.refreshTimeSeconds)}`);
    log.info(`    ↻ CS blocklists sync     every ${formatInterval(config.crowdsecBlocklists.refreshTimeSeconds)}`);
    log.info(`    ↻ Version check          every 1h`);

    const app = buildApp();

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
