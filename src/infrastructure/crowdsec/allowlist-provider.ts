import type { AllowlistProvider } from '@/application/ports/blocklist-source.port';
import { httpLapiClient } from './http-lapi-client';
import { log } from '@/infrastructure/system/logger';

/** Serves the current LAPI allowlist entries for check-allowlist use cases. */
export class HttpAllowlistProvider implements AllowlistProvider {
  async getEntries(): Promise<string[]> {
    try {
      const entries = await httpLapiClient.fetchAllowlistEntries();
      log.debug(`Fetched ${entries.length} allowlist entries from CrowdSec`);
      return entries;
    } catch {
      log.warn('Failed to fetch allowlists from CrowdSec. No allowlist filtering will be applied.');
      return [];
    }
  }
}
