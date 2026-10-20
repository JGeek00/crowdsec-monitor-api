import { databaseService } from '@/infrastructure/persistence/database-facade';
import { statusBlocklistService } from '@/infrastructure/status/memory-process-tracker';
import { log } from '@/infrastructure/system/logger';
import appDefaults from '@/constants/app-defaults';
import type { JobDefinition } from './check-lapi-health.job';

/**
 * Blocklists refresh job: full refresh of enabled blocklists.
 * Skips (instead of failing) when another blocklist process is running —
 * the 503 is exclusive to the HTTP endpoints.
 */
export const buildRefreshBlocklistsJob = (): JobDefinition => ({
  id: appDefaults.scheduler.blocklistsSync,
  everySeconds: 3600, // overridden by registry from config
  runOnBoot: true,
  overlap: 'skip',
  run: async () => {
    if (statusBlocklistService.isSyncingBlocklists()) {
      log.warn('Blocklists sync skipped: a refresh is already in progress');
      return { skipped: true };
    }
    await databaseService.refreshBlocklists();
    return { skipped: false };
  },
});
