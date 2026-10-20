// Implemented by: infrastructure/system/version-checker
// Called by: application/use-cases/status/version-check.usecase
export interface VersionCheckerPort {
  checkForNewVersion(): Promise<void>;
  getLatestVersion(): string | null;
}
