import axios from 'axios';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { CrowdSecCreateAlertPayload } from '@/types/crowdsec.types';
import { PROCESS_ERRORS } from '@/constants/process-errors';
import appDefaults from '@/constants/app-defaults';
import { config } from '@/config';
import { log } from '@/services/log.service';

/**
 * Service for all CrowdSec API interactions related to blocklists:
 * fetching allowlists, downloading blocklists, pushing alerts, and deleting alerts.
 */
class BlocklistCrowdSecService {
  /* ── Allowlist ──────────────────────────────────────────────────── */

  /** Fetch allowlist entries from CrowdSec for IP filtering. */
  public async fetchAllowlistEntries(): Promise<string[]> {
    try {
      const allowlists = await crowdSecAPI.allowlists.getAllowlists();
      const entries = allowlists.flatMap((al) => al.items.map((item) => item.value));
      log.debug(`  Fetched ${entries.length} allowlist entries from CrowdSec`);
      return entries;
    } catch {
      log.warn('Failed to fetch allowlists from CrowdSec. No allowlist filtering will be applied.');
      return [];
    }
  }

  /* ── Download ───────────────────────────────────────────────────── */

  /** Fetch a blocklist URL and return the raw content. */
  public async downloadBlocklist(blocklistUrl: string, blocklistName: string): Promise<{ rawContent: string }> {
    const response = await axios
      .get<string>(blocklistUrl, {
        responseType: 'text',
        timeout: 30000,
      })
      .catch(() => {
        throw new Error(PROCESS_ERRORS.blocklistImport.fetchFailed);
      });

    log.debug(`  Fetched "${blocklistName}": ${response.data.length} bytes`);
    return { rawContent: response.data };
  }

  /* ── CrowdSec Alert Builder ─────────────────────────────────────── */

  /** Build a CrowdSec alert payload for a chunk of IPs. */
  public buildAlertPayload(chunk: string[], allIps: string[], name: string): CrowdSecCreateAlertPayload {
    const scenario = `external/blocklist (${name})`;
    return [
      {
        capacity: 0,
        events: [],
        events_count: 1,
        leakspeed: '0',
        message: `Blocking ${allIps.length} IPs from list ${name}`,
        scenario,
        scenario_hash: '',
        scenario_version: '',
        simulated: false,
        source: { scope: 'Ip', value: '0.0.0.0' },
        start_at: new Date().toISOString(),
        stop_at: new Date().toISOString(),
        decisions: chunk.map((value: string) => ({
          duration: config.blocklistBanDuration,
          origin: appDefaults.blocklists.importOrigin,
          scenario,
          scope: 'Ip',
          type: 'ban',
          value,
        })),
      },
    ];
  }

  /* ── CrowdSec Push ──────────────────────────────────────────────── */

  /** Push IPs to CrowdSec in batches, creating alert payloads for each. */
  public async pushIpsToCrowdSec(ips: string[], name: string, onChunk?: (chunkSize: number) => void): Promise<number> {
    if (ips.length === 0) {
      log.debug(`  No IPs to push for "${name}"`);
      return 0;
    }

    const pushChunkSize = config.blocklists.writeChunkSize ?? ips.length;
    const batchCount = Math.ceil(ips.length / pushChunkSize);
    log.debug(`  Pushing "${name}" to CrowdSec: ${ips.length} IPs, ${batchCount} batch(es) of ${pushChunkSize}`);

    let pushed = 0;

    for (let i = 0; i < ips.length; i += pushChunkSize) {
      const chunk = ips.slice(i, i + pushChunkSize);
      const payload = this.buildAlertPayload(chunk, ips, name);

      await crowdSecAPI.alerts.createAlerts(payload).catch(() => {
        throw new Error(PROCESS_ERRORS.blocklistImport.crowdSecPushFailed);
      });

      pushed += chunk.length;
      onChunk?.(chunk.length);
      log.debug(
        `    Batch ${Math.floor(i / pushChunkSize) + 1}/${batchCount} sent for "${name}" (${chunk.length} decisions)`,
      );
    }

    return pushed;
  }

  /* ── CrowdSec Alert Deletion ────────────────────────────────────── */

  /**
   * Fetch and delete all CrowdSec alerts for a blocklist.
   * @param onAlertDeleted - Optional callback per-alert for progress tracking.
   * @returns total number of decisions removed.
   */
  public async deleteBlocklistAlerts(
    blocklistName: string,
    onAlertDeleted?: (alertId: number, decisionsCount: number, totalProcessed: number) => void,
  ): Promise<{ alertsCount: number; totalDecisions: number }> {
    log.debug(`  Deleting CrowdSec alerts for "${blocklistName}"...`);

    const scenario = `external/blocklist (${blocklistName})`;
    const alerts = await crowdSecAPI.alerts
      .getAlerts({
        origin: appDefaults.blocklists.importOrigin,
        scenario,
      })
      .catch(() => {
        throw new Error(PROCESS_ERRORS.blocklistDisable.crowdSecAlertsFetchFailed);
      });

    log.debug(`  Found ${alerts.length} alert(s) for "${blocklistName}"`);
    const totalDecisions = alerts.reduce((sum, a) => sum + (a.decisions?.length ?? 0), 0);

    if (alerts.length > 0) {
      let processedIps = 0;
      for (const alert of alerts) {
        log.debug(`    Deleting alert ${alert.id} (${alert.decisions?.length || 0} decisions) for "${blocklistName}"`);
        await crowdSecAPI.alerts.deleteAlert(alert.id).catch(() => {
          throw new Error(PROCESS_ERRORS.blocklistDisable.crowdSecAlertDeleteFailed);
        });
        processedIps += alert.decisions?.length ?? 0;
        onAlertDeleted?.(alert.id, alert.decisions?.length ?? 0, processedIps);
      }
      log.debug(`  Deleted ${alerts.length} alerts (${processedIps} decisions) for "${blocklistName}"`);
    }

    return { alertsCount: alerts.length, totalDecisions };
  }

  /* ── CrowdSec Connection Verification ───────────────────────────── */

  /** Verify CrowdSec API is reachable (used before starting bulk sync). */
  public async verifyConnection(): Promise<void> {
    await crowdSecAPI.alerts.getAlerts({});
  }
}

export const blocklistCrowdSecService = new BlocklistCrowdSecService();
