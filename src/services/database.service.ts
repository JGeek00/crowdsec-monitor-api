import { Op } from 'sequelize';
import { Alert, Decision, Blocklist, BlocklistIp } from '../models';
import { sequelize } from '../config/database';
import { crowdSecAPI } from './crowdsec-api.service';
import { calculateExpiration, calculateRetentionCutoff } from '../utils/duration';
import { config } from '../config';

/**
 * Service for managing database operations and syncing data from CrowdSec LAPI.
 * The database stores all alerts and decisions from LAPI.
 * Existing alerts and decisions are overwritten with the latest data from LAPI.
 *
 * A single writeLock serializes all DB writes. Network fetches always happen
 * BEFORE acquiring the lock so they never block each other or hold the lock
 * during I/O. SQLite WAL mode + busy_timeout handle any residual contention.
 */
export class DatabaseService {
  private lastSuccessfulSync: Date | null = null;

  // Single write lock — only one sync writes to SQLite at a time
  private writeLock: Promise<void> = Promise.resolve();

  private acquireWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.writeLock.then(() => fn());
    // Must never reject so the chain stays alive for subsequent callers
    this.writeLock = next.then(() => {}, () => {});
    return next;
  }

  /**
   * Get the timestamp of the last successful sync
   */
  getLastSuccessfulSync(): Date | null {
    return this.lastSuccessfulSync;
  }

  /**
   * Sync alerts from CrowdSec LAPI to local database
   * Overwrites existing alerts and decisions with latest data from LAPI
   * Also syncs related decisions
   */
  async syncAlerts(): Promise<{ synced: number; updated: number; errors: number; decisions: number }> {
    // --- Phase 1: fetch from network (outside the lock, never blocks DB writes) ---
    let alerts: Awaited<ReturnType<typeof crowdSecAPI.getAlerts>>;
    try {
      console.log('Starting alerts sync...');
      const results = await Promise.all([
        crowdSecAPI.getAlerts({ origin: 'crowdsec' }),
        crowdSecAPI.getAlerts({ origin: 'cscli' }),
        crowdSecAPI.getAlerts({ origin: 'console' }),
        crowdSecAPI.getAlerts({ origin: 'appsec' })
      ]);
      alerts = results.flat();
    } catch (error) {
      console.error('Error fetching alerts from LAPI:', error);
      return { synced: 0, updated: 0, errors: 1, decisions: 0 };
    }

    // --- Phase 2: write to DB (inside the lock) ---
    return this.acquireWriteLock(async () => {
      try {
      let synced = 0;
      let updated = 0;
      let errors = 0;
      let decisionsCount = 0;

      for (const alert of alerts) {
        try {
          // Check if alert already exists
          const existingAlert = await Alert.findByPk(alert.id);
          
          const alertData = {
            id: alert.id,
            uuid: alert.uuid,
            scenario: alert.scenario,
            scenario_version: alert.scenario_version,
            scenario_hash: alert.scenario_hash,
            message: alert.message,
            capacity: alert.capacity,
            leakspeed: alert.leakspeed,
            simulated: alert.simulated,
            remediation: alert.remediation,
            events_count: alert.events_count,
            machine_id: alert.machine_id,
            source: alert.source,
            labels: alert.labels,
            meta: alert.meta || [],
            events: alert.events || [],
            crowdsec_created_at: new Date(alert.created_at),
            start_at: new Date(alert.start_at),
            stop_at: new Date(alert.stop_at),
            updated_at: new Date(),
          };

          let alertInstance;
          if (existingAlert) {
            // Alert exists, update it
            await existingAlert.update(alertData);
            alertInstance = existingAlert;
            updated++;
          } else {
            // Create new alert
            alertInstance = await Alert.create({
              ...alertData,
              created_at: new Date(),
            });
            synced++;
          }

          // Process decisions for this alert
          if (alert.decisions && alert.decisions.length > 0) {
            // Alert has decisions in LAPI
            const lapiDecisionIds = alert.decisions.map(d => d.id);
            
            // Delete local decisions that are not in LAPI anymore
            await Decision.destroy({
              where: {
                alert_id: alertInstance.id,
                id: {
                  [Op.notIn]: lapiDecisionIds,
                },
              },
            });

            // Create or update decisions from LAPI
            for (const decision of alert.decisions) {
              try {
                // Check if decision already exists
                const existingDecision = await Decision.findByPk(decision.id);
                
                const decisionData = {
                  id: decision.id,
                  alert_id: alertInstance.id,
                  origin: decision.origin,
                  type: decision.type,
                  scope: decision.scope,
                  value: decision.value,
                  expiration: calculateExpiration(decision.duration),
                  scenario: decision.scenario,
                  simulated: decision.simulated,
                  source: alert.source,
                  crowdsec_created_at: new Date(alert.created_at),
                  updated_at: new Date(),
                };

                if (existingDecision) {
                  // Decision exists, update it
                  await existingDecision.update(decisionData);
                } else {
                  // Create new decision
                  await Decision.create({
                    ...decisionData,
                    created_at: new Date(),
                  });
                }
                decisionsCount++;
              } catch (decisionError) {
                // Skip decision if there's any error
                console.error(`Error syncing decision ${decision.id}:`, decisionError);
              }
            }
          } else {
            // Alert has no decisions in LAPI, delete all local decisions for this alert
            await Decision.destroy({
              where: {
                alert_id: alertInstance.id,
              },
            });
          }
        } catch (error) {
          // Skip alert if there's any error
          console.error(`Error syncing alert ${alert.id}:`, error);
          errors++;
        }
      }

      console.log(`✓ Alerts sync completed: ${synced} new, ${updated} updated, ${decisionsCount} decisions synced, ${errors} errors`);
      
      // Auto-cleanup old data if retention is configured
      await this.cleanupOldData();
      
      // Update last successful sync timestamp
      this.lastSuccessfulSync = new Date();
      
      return { synced, updated, errors, decisions: decisionsCount };
    } catch (error) {
      console.error('Error syncing alerts:', error);
      return { synced: 0, updated: 0, errors: 1, decisions: 0 };
    }
    });
  }

  /**
   * Clean up old data based on configured retention period
   * Deletes alerts and decisions older than the retention period
   */
  async cleanupOldData(): Promise<{ deletedAlerts: number; deletedDecisions: number }> {
    const cutoffDate = calculateRetentionCutoff(config.database.retention);
    
    if (!cutoffDate) {
      // Retention not configured, skip cleanup
      return { deletedAlerts: 0, deletedDecisions: 0 };
    }

    try {
      console.log(`Starting data cleanup for records older than ${cutoffDate.toISOString()}...`);
      
      // Delete old decisions first (due to foreign key constraint)
      const deletedDecisions = await Decision.destroy({
        where: {
          created_at: {
            [Op.lt]: cutoffDate,
          },
        },
      });

      // Delete old alerts
      const deletedAlerts = await Alert.destroy({
        where: {
          created_at: {
            [Op.lt]: cutoffDate,
          },
        },
      });

      if (deletedAlerts > 0 || deletedDecisions > 0) {
        console.log(`✓ Cleanup completed: ${deletedAlerts} alerts and ${deletedDecisions} decisions deleted`);
      }

      return { deletedAlerts, deletedDecisions };
    } catch (error) {
      console.error('Error during data cleanup:', error);
      return { deletedAlerts: 0, deletedDecisions: 0 };
    }
  }

  /**
   * Sync decisions from alerts (decisions are now synced with alerts)
   * @deprecated Use syncAlerts() instead, which now syncs both alerts and decisions
   */
  async syncDecisions(): Promise<{ synced: number; errors: number }> {
    console.log('⚠️  syncDecisions is deprecated. Decisions are now synced with alerts.');
    return { synced: 0, errors: 0 };
  }

  /**
   * Sync all data from CrowdSec LAPI
   */
  async syncAll(): Promise<{ alerts: any }> {
    const alerts = await this.syncAlerts();
    return { alerts };
  }

  /**
   * Sync blocklists from CrowdSec LAPI to local database.
   *
   * Strategy:
   *  1. Fetch all data from network BEFORE acquiring any write lock.
   *  2. Upsert the Blocklist (name) row with one small lock acquisition.
   *  3. Write ALL IPs for that blocklist in ONE SQLite transaction.
   *     A single BEGIN/COMMIT per blocklist keeps the WAL file small and
   *     prevents the accumulation of hundreds of micro-transactions that
   *     slow down subsequent reads (WAL frame scanning overhead).
   *  4. Checkpoint the WAL after the sync to compact it back to the main DB.
   */
  async syncBlocklists(): Promise<{ synced: number; updated: number; ips: number; errors: number }> {
    const CHUNK_SIZE = 1000; // rows per bulkCreate call inside the transaction
    let synced = 0;
    let updated = 0;
    let ipsCount = 0;
    let errors = 0;

    const processOrigin = async (origin: 'blocklist-import' | 'lists'): Promise<void> => {
      // --- Fetch from network (outside the lock) ---
      let alerts: Awaited<ReturnType<typeof crowdSecAPI.getAlerts>>;
      try {
        console.log(`Fetching blocklists (origin: ${origin})...`);
        alerts = await crowdSecAPI.getAlerts({ origin });
        const totalIps = alerts.reduce((acc, a) => acc + (a.decisions?.length ?? 0), 0);
        console.log(`Fetched ${alerts.length} blocklist alerts, ${totalIps} IPs total (origin: ${origin})`);
      } catch (error) {
        console.error(`Error fetching blocklists (origin: ${origin}):`, error);
        errors++;
        return;
      }

      const totalAlerts = alerts.length;
      const totalIps = alerts.reduce((acc, a) => acc + (a.decisions?.length ?? 0), 0);
      let alertsDone = 0;
      let ipsDone = 0;

      for (const alert of alerts) {
        try {
          const name = origin === 'blocklist-import'
            ? alert.scenario
            : alert.source?.scope ?? alert.scenario;

          if (!name) continue;

          // --- Upsert the Blocklist row (small lock window) ---
          const [blocklistInstance, created] = await this.acquireWriteLock(() =>
            Blocklist.findOrCreate({ where: { name }, defaults: { name } })
          );

          if (created) {
            synced++;
          } else {
            updated++;
          }

          alertsDone++;
          const alertPct = totalAlerts > 0 ? Math.round((alertsDone / totalAlerts) * 100) : 100;
          console.log(`[${origin}] Lists: ${alertsDone}/${totalAlerts} (${alertPct}%) — IPs written: ${ipsDone}/${totalIps}`);

          if (!alert.decisions?.length) continue;

          // --- Write ALL IPs for this blocklist in ONE transaction ---
          // One BEGIN/COMMIT vs. N×(CHUNK_SIZE=100) keeps the WAL file small.
          const decisions = alert.decisions;
          await this.acquireWriteLock(async () => {
            await sequelize.transaction(async (t) => {
              for (let i = 0; i < decisions.length; i += CHUNK_SIZE) {
                const chunk = decisions.slice(i, i + CHUNK_SIZE).map(d => ({
                  id: d.id,
                  blocklist_id: blocklistInstance.id,
                  scenario: d.scenario,
                  value: d.value,
                  type: d.type,
                  scope: d.scope,
                  updated_at: new Date(),
                }));
                await BlocklistIp.bulkCreate(chunk, {
                  transaction: t,
                  updateOnDuplicate: ['blocklist_id', 'scenario', 'value', 'type', 'scope', 'updated_at'],
                });
              }
            });
          });

          ipsCount += decisions.length;
          ipsDone += decisions.length;
          const ipPct = totalIps > 0 ? Math.round((ipsDone / totalIps) * 100) : 100;
          console.log(`[${origin}] IPs written for "${name}": ${ipsDone}/${totalIps} (${ipPct}%)`);
        } catch (alertError) {
          console.error(`Error syncing blocklist alert ${alert.id}:`, alertError);
          errors++;
        }
      }

      console.log(`✓ Finished origin "${origin}": ${alertsDone} lists, ${ipsDone} IPs written`);
    };

    console.log('Starting blocklists sync...');
    await processOrigin('blocklist-import');
    await processOrigin('lists');

    // Compact the WAL back into the main DB file after a large write session.
    // This is a no-op (and would error) on PostgreSQL, so guard with the mode check.
    if (config.database.mode === 'sqlite') {
      await sequelize.query('PRAGMA wal_checkpoint(PASSIVE);');
    }

    console.log(`✓ Blocklists sync completed: ${synced} new lists, ${updated} existing lists, ${ipsCount} IPs upserted, ${errors} errors`);
    return { synced, updated, ips: ipsCount, errors };
  }
}

export const databaseService = new DatabaseService();
