import appDefaults from '@/constants/app-defaults';
import type { Logger } from '@/application/ports/logger.port';
import type { ProcessTrackerPort } from '@/application/ports/process-tracker.port';
import type { JobDefinition } from './check-lapi-health.job';

/**
 * Blocklists refresh job: full refresh of enabled blocklists.
 * Skips (instead of failing) when another blocklist process is running —
 * the 503 is exclusive to the HTTP endpoints.
 */
export const buildRefreshBlocklistsJob = (deps: {
  tracker: Pick<ProcessTrackerPort, 'isSyncingBlocklists'>;
  runRefresh: () => Promise<unknown>;
  logger: Logger;
}): JobDefinition => ({
  id: appDefaults.scheduler.blocklistsSync,
  everySeconds: 3600, // overridden by registry from config
  runOnBoot: true,
  overlap: 'skip',
  run: async () => {
    if (deps.tracker.isSyncingBlocklists()) {
      deps.logger.warn('Blocklists sync skipped: a refresh is already in progress');
      return { skipped: true };
    }
    await deps.runRefresh();
    return { skipped: false };
  },
});
