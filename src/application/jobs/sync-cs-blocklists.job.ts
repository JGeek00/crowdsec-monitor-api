import appDefaults from '@/constants/app-defaults';
import { SyncCsBlocklistsUseCase } from '@/application/use-cases/blocklists/sync-cs-blocklists.usecase';
import type { JobDefinition } from './check-lapi-health.job';

/**
 * CrowdSec-managed blocklists sync job (origin=lists alerts → cs_blocklists + IPs).
 */
export const buildSyncCsBlocklistsJob = (deps: {
  syncCsBlocklists: SyncCsBlocklistsUseCase;
}): JobDefinition => ({
  id: appDefaults.scheduler.csBlocklistsSync,
  everySeconds: 3600, // overridden by registry from config
  runOnBoot: true,
  overlap: 'skip',
  run: () => deps.syncCsBlocklists.execute(),
});
