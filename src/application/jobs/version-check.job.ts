import appDefaults from '@/constants/app-defaults';
import type { JobDefinition } from './check-lapi-health.job';

/**
 * Version check job: queries the upstream release feed hourly (on boot too).
 * The status-store update lives inside CheckVersionUseCase.
 */
export const buildVersionCheckJob = (deps: {
  checkVersion: { execute(): Promise<void> };
}): JobDefinition => ({
  id: appDefaults.scheduler.versionCheck,
  everySeconds: 3600,
  runOnBoot: true,
  overlap: 'skip',
  run: () => deps.checkVersion.execute(),
});
