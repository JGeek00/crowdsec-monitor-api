import { databaseService } from '@/services';
import appDefaults from '@/constants/app-defaults';
import type { JobDefinition } from './check-lapi-health.job';

/**
 * CrowdSec-managed blocklists sync job (origin=lists alerts → cs_blocklists + IPs).
 */
export const buildSyncCsBlocklistsJob = (): JobDefinition => ({
  id: appDefaults.scheduler.csBlocklistsSync,
  everySeconds: 3600, // overridden by registry from config
  runOnBoot: true,
  overlap: 'skip',
  run: () => databaseService.syncCsBlocklists(),
});
