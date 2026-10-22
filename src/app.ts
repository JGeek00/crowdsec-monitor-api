import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import routes from '@/delivery/http/routes';
import { mcpHttpRouter } from '@/delivery/mcp/http';
import { AuthMiddleware } from '@/delivery/http/middlewares/auth.middleware';
import { errorHandler } from '@/delivery/http/middlewares/error.middleware';
import { notFoundHandler } from '@/delivery/http/middlewares/not-found.middleware';
import { JobRegistry } from '@/infrastructure/scheduling/job-registry';
import { crowdSecAPI } from '@/infrastructure/crowdsec/lapi/crowdsec-api';
import { statusService } from '@/infrastructure/status/monitor-status-store';
import { statusBlocklistService } from '@/infrastructure/status/memory-process-tracker';
import { blocklistOpsService } from '@/infrastructure/sync/blocklist-ops';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';
import {
  buildLapiHealthJob,
  buildSyncAlertsJob,
  buildVersionCheckJob,
  buildRefreshBlocklistsJob,
  buildSyncCsBlocklistsJob,
} from '@/application/jobs';

export interface JobRegistryLike {
  startAll: () => void;
  stopAll: () => void;
}

/**
 * Manual composition root (layered-architecture reorg).
 *
 * `buildApp` / `buildJobRegistry` are the application-facing factories for the
 * bootstrap (server.ts). Jobs live in application/jobs and are scheduled by
 * the infrastructure JobRegistry with stable ids (appDefaults.scheduler).
 */
export const buildApp = (): Application => createApp();

/**
 * Builds the job registry with its dependencies injected (legacy order
 * preserved: lapi, sync, version, blocklists, cs-blocklists).
 */
export const buildJobRegistry = (): JobRegistryLike => {
  const statusStore = {
    updateLapi: (connected: boolean, lastSuccessfulSync: string | null): void => {
      statusService.updateLapiStatus(connected, lastSuccessfulSync);
    },
  };
  const syncAlerts = container.useCases.alerts.syncAlerts;

  return new JobRegistry([
    {
      ...buildLapiHealthJob({ lapiClient: crowdSecAPI, syncAlerts, statusStore }),
      everySeconds: config.lapiCheck.intervalSeconds,
    },
    {
      ...buildSyncAlertsJob({ syncAlerts, lapiClient: crowdSecAPI, statusStore }),
      everySeconds: config.sync.intervalSeconds,
    },
    buildVersionCheckJob({ checkVersion: container.useCases.status.checkVersion }),
    {
      ...buildRefreshBlocklistsJob({
        tracker: statusBlocklistService,
        runRefresh: async () => {
          await blocklistOpsService.refreshBlocklists();
        },
        logger: log,
      }),
      everySeconds: config.blocklists.refreshTimeSeconds,
    },
    {
      ...buildSyncCsBlocklistsJob({ syncCsBlocklists: container.useCases.blocklists.syncCsBlocklists }),
      everySeconds: config.crowdsecBlocklists.refreshTimeSeconds,
    },
  ]);
};

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Rate limiting (REST and MCP have independent limits)
  const buildLimiter = (limit: { max: number; windowMs: number }) =>
    rateLimit({
      windowMs: limit.windowMs,
      max: limit.max,
      message: { error: 'Too many requests', message: 'Too many requests from this IP, please try again later.' },
    });
  if (config.rateLimit) {
    app.use('/api/v1/', buildLimiter(config.rateLimit));
  }
  if (config.mcpRateLimit) {
    app.use('/mcp', buildLimiter(config.mcpRateLimit));
  }

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  if (config.logs.httpRequests) {
    const format = config.server.nodeEnv === 'development' ? 'dev' : 'combined';
    app.use(
      morgan(format, {
        // ponytail: morgan evaluates skip when the response finishes, after Express
        // mounts may have stripped req.url; originalUrl keeps the real request path.
        skip: (req) => {
          const path = (req.originalUrl ?? req.url).split('?')[0];
          return (path === '/health' || path.startsWith('/mcp')) && config.logs.level !== 'debug';
        },
      }),
    );
  }

  // Routes
  app.use('/api/v1', routes);

  // MCP server (its own protocol, not part of the REST API)
  app.use('/mcp', AuthMiddleware.expressAuth, mcpHttpRouter);

  // Root endpoint
  app.get('/', (req, res) => {
    res.status(404).send();
  });

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
