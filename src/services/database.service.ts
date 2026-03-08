import { Op } from 'sequelize';
import { Alert, Decision, Blocklist, BlocklistIp } from '../models';
import { crowdSecAPI } from './crowdsec-api.service';
import { calculateExpiration, calculateRetentionCutoff } from '../utils/duration';
import { config } from '../config';

/**
 * Service for managing database operations and syncing data from CrowdSec LAPI.
 * The database stores all alerts and decisions from LAPI.
 * Existing alerts and decisions are overwritten with the latest data from LAPI.
 */
export class DatabaseService {
  private lastSuccessfulSync: Date | null = null;

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
    try {
      console.log('Starting alerts sync...');
      const results = await Promise.all([
        crowdSecAPI.getAlerts({ origin: 'crowdsec' }),
        crowdSecAPI.getAlerts({ origin: 'cscli' }),
        crowdSecAPI.getAlerts({ origin: 'console' }),
        crowdSecAPI.getAlerts({ origin: 'appsec' })
      ]);
      const alerts = results.flat();

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
   * Fetches alerts with origin "blocklist-import" and "lists" in parallel.
   * Upserts rows in `lists` (by unique name) and `blocklist_ips` (by decision id).
   */
  async syncBlocklists(): Promise<{ synced: number; updated: number; ips: number; errors: number }> {
    try {
      console.log('Starting blocklists sync...');

      // Fetch both origins in parallel
      const [blocklistImportAlerts, listsAlerts] = await Promise.all([
        crowdSecAPI.getAlerts({ origin: 'blocklist-import' }),
        crowdSecAPI.getAlerts({ origin: 'lists' }),
      ]);

      const allAlerts = [
        ...blocklistImportAlerts.map(a => ({ alert: a, origin: 'blocklist-import' as const })),
        ...listsAlerts.map(a => ({ alert: a, origin: 'lists' as const })),
      ];

      let synced = 0;
      let updated = 0;
      let ipsCount = 0;
      let errors = 0;

      for (const { alert, origin } of allAlerts) {
        try {
          // Determine the blocklist name:
          // - blocklist-import: use alert.scenario
          // - lists: use alert.source.scope
          const name = origin === 'blocklist-import' ? alert.scenario : alert.source?.scope ?? alert.scenario;

          if (!name) {
            continue;
          }

          // Upsert the blocklist row (find or create by name)
          const [blocklistInstance, created] = await Blocklist.findOrCreate({
            where: { name },
            defaults: { name },
          });

          if (created) {
            synced++;
          } else {
            updated++;
          }

          // Upsert each decision as a blocklist_ip
          if (alert.decisions && alert.decisions.length > 0) {
            for (const decision of alert.decisions) {
              try {
                await BlocklistIp.upsert({
                  id: decision.id,
                  blocklist_id: blocklistInstance.id,
                  scenario: decision.scenario,
                  value: decision.value,
                  type: decision.type,
                  scope: decision.scope,
                  updated_at: new Date(),
                });
                ipsCount++;
              } catch (decisionError) {
                console.error(`Error syncing blocklist IP ${decision.id}:`, decisionError);
              }
            }
          }
        } catch (alertError) {
          console.error(`Error syncing blocklist alert ${alert.id}:`, alertError);
          errors++;
        }
      }

      console.log(`✓ Blocklists sync completed: ${synced} new lists, ${updated} existing lists, ${ipsCount} IPs upserted, ${errors} errors`);
      return { synced, updated, ips: ipsCount, errors };
    } catch (error) {
      console.error('Error syncing blocklists:', error);
      return { synced: 0, updated: 0, ips: 0, errors: 1 };
    }
  }
}

export const databaseService = new DatabaseService();
