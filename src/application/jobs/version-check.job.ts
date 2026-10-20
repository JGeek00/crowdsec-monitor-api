import { versionCheckerService, statusService } from '@/services';
import appDefaults from '@/constants/app-defaults';
import type { JobDefinition } from './check-lapi-health.job';

/**
 * Version check job: queries the upstream release feed hourly (on boot too).
 */
export const buildVersionCheckJob = (): JobDefinition => ({
  id: appDefaults.scheduler.versionCheck,
  everySeconds: 3600,
  runOnBoot: true,
  overlap: 'skip',
  run: async () => {
    await versionCheckerService.checkForNewVersion();
    statusService.updateVersionInfo(versionCheckerService.getLatestVersion());
  },
});
