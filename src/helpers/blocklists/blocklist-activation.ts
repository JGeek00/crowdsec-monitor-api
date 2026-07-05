import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { statusService } from '@/services/status.service';
import { log } from '@/services/log.service';
import { PROCESS_ERRORS } from '@/constants/process-errors';

/**
 * Fetch active CrowdSec decisions and deduplicate IPs.
 * Updates bouncer status on success/failure.
 * Throws if connection fails or active decisions cannot be fetched.
 */
export async function fetchAndDeduplicateIps(
  filteredIps: string[],
  name: string,
): Promise<{ uniqueNewIps: string[]; alreadyBlocked: number }> {
  let activeDecisions: Set<string>;
  try {
    activeDecisions = await crowdSecAPI.decisions.getActiveDecisions();
    crowdSecAPI.setBouncerConnected(true);
    statusService.updateBouncerStatus(true);
    log.debug(`  Fetched ${activeDecisions.size} active decisions from CrowdSec`);
  } catch {
    log.error(`Failed to fetch active decisions from CrowdSec. Aborting import for "${name}".`);
    crowdSecAPI.setBouncerConnected(false);
    statusService.updateBouncerStatus(false);
    throw new Error(PROCESS_ERRORS.blocklistImport.crowdSecDecisionsFailed);
  }

  const uniqueNewIps = [...new Set(filteredIps.filter((ip) => !activeDecisions.has(ip)))];
  const alreadyBlocked = filteredIps.length - uniqueNewIps.length;

  if (alreadyBlocked > 0) {
    log.debug(`  "${name}": ${alreadyBlocked} IPs already blocked in CrowdSec`);
  }
  log.debug(`  "${name}": ${uniqueNewIps.length} new IPs ready to push`);

  return { uniqueNewIps, alreadyBlocked };
}

type RefreshMetadata = {
  last_refresh_attempt: Date;
  last_successful_refresh?: Date;
  last_refresh_failed: boolean;
};

/**
 * Build DB metadata payload and log summary message for blocklist activation.
 */
export function buildActivationSummary(
  name: string,
  ips: string[],
  uniqueNewIps: string[],
  allowlistSkipped: number,
  success: boolean,
): { metadata: RefreshMetadata; logMessage?: string } {
  const metadata: RefreshMetadata = {
    last_refresh_attempt: new Date(),
    last_refresh_failed: !success,
  };

  let logMessage: string | undefined;

  if (success) {
    metadata.last_successful_refresh = new Date();
    const alreadyBlocked = ips.length - uniqueNewIps.length;
    const parts = [
      `${uniqueNewIps.length} pushed to CrowdSec`,
      alreadyBlocked > 0 ? `${alreadyBlocked} already blocked` : null,
      allowlistSkipped > 0 ? `${allowlistSkipped} in allowlist` : null,
    ]
      .filter(Boolean)
      .join(', ');
    logMessage = `Activated "${name}": ${ips.length} IPs in list — ${parts}`;
  }

  return { metadata, logMessage };
}
