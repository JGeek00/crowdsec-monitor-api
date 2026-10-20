import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import routes from '@/routes';
import { errorHandler } from '@/middlewares/error.middleware';
import { notFoundHandler } from '@/middlewares/not-found.middleware';
import {
  databaseService,
  schedulerService,
  versionCheckerService,
  statusService,
  statusBlocklistService,
  log,
} from '@/services';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import appDefaults from '@/constants/app-defaults';

export interface JobRegistry {
  startAll: () => void;
  stopAll: () => void;
}

/**
 * Manual composition root (layered-architecture reorg, T1).
 *
 * For now `buildApp` / `buildJobRegistry` wire the legacy singletons so the
 * bootstrap (server.ts) stops owning inline scheduler lambdas. Successive
 * strangler tasks replace these singletons with ports + use cases behind
 * manual DI, without changing behaviour.
 */
export const buildApp = (): Application => createApp();

export const buildJobRegistry = (): JobRegistry => {
  const startAll = (): void => {
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
  };

  return {
    startAll,
    stopAll: (): void => {
      schedulerService.stopAll();
    },
  };
};

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Rate limiting
  if (config.rateLimit) {
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: { error: 'Too many requests', message: 'Too many requests from this IP, please try again later.' },
    });
    app.use('/api/v1/', limiter);
  }

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  if (config.logs.httpRequests) {
    const format = config.server.nodeEnv === 'development' ? 'dev' : 'combined';
    app.use(
      morgan(format, {
        skip: (req) => req.path === '/health' && config.logs.level !== 'debug',
      }),
    );
  }

  // Routes
  app.use('/api/v1', routes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.status(404).send();
  });

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
