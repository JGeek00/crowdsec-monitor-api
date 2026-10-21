import type { VersionCheckerPort } from '@/application/ports/version-checker.port';

// Called by: application/jobs/version-check.job
export class CheckVersionUseCase {
  constructor(
    private readonly deps: {
      versionChecker: VersionCheckerPort;
      statusStore: { updateVersionInfo(latestVersion: string | null): void };
    },
  ) {}

  async execute(): Promise<void> {
    await this.deps.versionChecker.checkForNewVersion();
    this.deps.statusStore.updateVersionInfo(this.deps.versionChecker.getLatestVersion());
  }
}
