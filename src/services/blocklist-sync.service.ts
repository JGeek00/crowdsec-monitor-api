import axios from 'axios';
import { Blocklist, BlocklistIp } from '@/models';
import { sequelize } from '@/config/database';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { CrowdSecCreateAlertPayload } from '@/types/crowdsec.types';
import { countIpsInValue } from '@/utils/ip-count';
import { config } from '@/config';
import { ipv4Regex, ipv4CidrRegex, ipv6Regex, ipv6CidrRegex } from '@/constants/regexps';

class BlocklistSyncService {
  private writeLock: Promise<void> = Promise.resolve();

  private acquireWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.writeLock.then(() => fn());
    this.writeLock = next.then(() => {}, () => {});
    return next;
  }

  /**
   * Fetch a blocklist URL, store IPs in the local DB, and push to CrowdSec.
   */
  async refreshBlocklist(blocklist: Blocklist): Promise<void> {
    const CHUNK_SIZE = 1000;

    await this.acquireWriteLock(() =>
      blocklist.update({ last_refresh_attempt: new Date() })
    );

    const response = await axios.get<string>(blocklist.url, {
      responseType: 'text',
      timeout: 30000,
    });

    const ips = response.data
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) =>
        !line.startsWith('#') &&
        (ipv4Regex.test(line) || ipv4CidrRegex.test(line) || ipv6Regex.test(line) || ipv6CidrRegex.test(line))
      );

    const totalIpCount = ips.reduce((sum: number, v: string) => sum + countIpsInValue(v), 0);

    // Fetch currently active decisions from CrowdSec to avoid pushing duplicates
    let activeDecisions: Set<string>;
    try {
      activeDecisions = await crowdSecAPI.getActiveDecisions();
    } catch {
      console.error(`Failed to fetch active decisions from CrowdSec. Aborting blocklist import for "${blocklist.name}".`);
      throw new Error(`Failed to fetch active decisions from CrowdSec`);
    }
    const uniqueNewIps = [...new Set(ips.filter((ip) => !activeDecisions.has(ip)))];
    const skipped = ips.length - uniqueNewIps.length;
    if (skipped > 0) {
      console.log(`  Skipping ${skipped} IPs already blocked in CrowdSec for "${blocklist.name}"`);
    }

    // Save all IPs from the list to the DB (regardless of what's already in CrowdSec)
    await this.acquireWriteLock(async () => {
      await sequelize.transaction(async (t) => {
        await BlocklistIp.destroy({ where: { blocklist_id: blocklist.id }, transaction: t });

        for (let i = 0; i < ips.length; i += CHUNK_SIZE) {
          const chunk = ips.slice(i, i + CHUNK_SIZE).map((value: string) => ({
            blocklist_id: blocklist.id,
            blocklist_name: blocklist.name,
            value,
            origin: 'blocklist' as const,
          }));
          await BlocklistIp.bulkCreate(chunk, { transaction: t, ignoreDuplicates: true });
        }
      });
    });

    const scenario = `external/blocklist (${blocklist.name})`;
    const now = new Date().toISOString();
    const batchCount = Math.ceil(uniqueNewIps.length / CHUNK_SIZE);

    if (uniqueNewIps.length === 0) {
      console.log(`No new IPs to push for "${blocklist.name}" (all already blocked in CrowdSec)`);
    } else {
      console.log(`Pushing "${blocklist.name}" to CrowdSec (${uniqueNewIps.length} new entries, ${batchCount} batch(es))...`);

      for (let i = 0; i < uniqueNewIps.length; i += CHUNK_SIZE) {
        const chunk = uniqueNewIps.slice(i, i + CHUNK_SIZE);

        const payload: CrowdSecCreateAlertPayload = [
          {
            capacity: 0,
            events: [],
            events_count: 1,
            leakspeed: '0',
            message: `Blocking ${totalIpCount} IPs from list ${blocklist.name}`,
            scenario,
            scenario_hash: '',
            scenario_version: '',
            simulated: false,
            source: { scope: 'Ip', value: '0.0.0.0' },
            start_at: now,
            stop_at: now,
            decisions: chunk.map((value: string) => ({
              duration: config.blocklistBanDuration,
              origin: 'cs-monitor-blocklist-import',
              scenario,
              scope: 'Ip',
              type: 'ban',
              value,
            })),
          },
        ];

        await crowdSecAPI.createAlerts(payload);

        const batchNum = Math.floor(i / CHUNK_SIZE) + 1;
        console.log(`  Batch ${batchNum}/${batchCount} sent (${chunk.length} decisions)`);
      }
    }

    await this.acquireWriteLock(() =>
      blocklist.update({ last_successful_refresh: new Date() })
    );

    console.log(`✓ Refreshed "${blocklist.name}": ${ips.length} IPs stored in DB, ${uniqueNewIps.length} pushed to CrowdSec (${skipped} skipped, already blocked)`);
  }

  /**
   * Delete all CrowdSec alerts for a blocklist and wipe its local IPs.
   */
  async deleteBlocklistAlerts(blocklist: Blocklist): Promise<void> {
    const scenario = `external/blocklist (${blocklist.name})`;

    const alerts = await crowdSecAPI.getAlerts({
      origin: 'cs-monitor-blocklist-import',
      scenario,
    });

    if (alerts.length > 0) {
      console.log(`Deleting ${alerts.length} alert(s) for blocklist "${blocklist.name}" from CrowdSec...`);
      for (const alert of alerts) {
        await crowdSecAPI.deleteAlert(alert.id);
      }
    }

    await this.acquireWriteLock(async () => {
      await BlocklistIp.destroy({ where: { blocklist_id: blocklist.id } });
    });

    console.log(`✓ Deleted alerts and IPs for blocklist "${blocklist.name}"`);
  }

  /**
   * Refresh every enabled blocklist and push to CrowdSec.
   */
  async syncBlocklists(): Promise<{ refreshed: number; ips: number; errors: number }> {
    let refreshed = 0;
    let ipsCount = 0;
    let errors = 0;

    const blocklists = await Blocklist.findAll({ where: { enabled: true } });

    if (blocklists.length === 0) {
      console.log('No enabled blocklists configured, skipping refresh.');
      return { refreshed: 0, ips: 0, errors: 0 };
    }

    console.log(`Starting blocklists refresh (${blocklists.length} enabled list(s))...`);

    for (const blocklist of blocklists) {
      try {
        await this.refreshBlocklist(blocklist);
        ipsCount += await BlocklistIp.count({ where: { blocklist_id: blocklist.id } });
        refreshed++;
      } catch (error) {
        console.error(`❌ Error refreshing blocklist "${blocklist.name}" (${blocklist.url}): ${error instanceof Error ? error.message : error}`);
        errors++;
      }
    }

    if (config.database.mode === 'sqlite') {
      await sequelize.query('PRAGMA wal_checkpoint(PASSIVE);');
    }

    console.log(`✓ Blocklists refresh completed: ${refreshed} refreshed, ${ipsCount} total entries, ${errors} errors`);
    return { refreshed, ips: ipsCount, errors };
  }
}

export const blocklistSyncService = new BlocklistSyncService();
