import { versionCheckerService } from '@/infrastructure/system/version-checker';
import { statusService } from '@/infrastructure/status/monitor-status-store';

// Called by: application/jobs/version-check.job
export class CheckVersionUseCase {
  async execute(): Promise<void> {
    await versionCheckerService.checkForNewVersion();
    statusService.updateVersionInfo(versionCheckerService.getLatestVersion());
  }
}

export const checkVersionUseCase = new CheckVersionUseCase();
