import { Alert, Decision } from '../models';
import { crowdSecAPI } from './crowdsec-api.service';
import { CrowdSecAlert, CrowdSecDecision } from '../types/crowdsec.types';
import { calculateExpiration, calculateRetentionCutoff } from '../utils/duration';
import { config } from '../config';
import { Op } from 'sequelize';

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
      const alerts = await crowdSecAPI.getAlerts();
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
}

export const databaseService = new DatabaseService();
