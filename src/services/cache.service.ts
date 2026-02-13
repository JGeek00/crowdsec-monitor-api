import { Alert, Decision } from '../models';
import { crowdSecAPI } from './crowdsec-api.service';
import { CrowdSecAlert, CrowdSecDecision } from '../types/crowdsec.types';

/**
 * Service for syncing alerts and decisions from CrowdSec LAPI to the local SQLite database.
 * The database stores all alerts incrementally (not as a temporary cache).
 * Only new alerts and decisions are added; existing ones are skipped to avoid duplicates.
 */
export class CacheService {
  /**
   * Sync alerts from CrowdSec LAPI to local database
   * Only adds new alerts incrementally, does not update existing ones
   * Also syncs related decisions
   */
  async syncAlerts(): Promise<{ synced: number; skipped: number; errors: number; decisions: number }> {
    try {
      console.log('Starting alerts sync...');
      const alerts = await crowdSecAPI.getAlerts();
      let synced = 0;
      let skipped = 0;
      let errors = 0;
      let decisionsCount = 0;

      for (const alert of alerts) {
        try {
          // Check if alert already exists by crowdsec_alert_id
          const existingAlert = await Alert.findOne({
            where: { crowdsec_alert_id: alert.id }
          });

          if (existingAlert) {
            // Alert already exists, skip it
            skipped++;
            
            // Still check and add new decisions if they don't exist
            if (alert.decisions && alert.decisions.length > 0) {
              for (const decision of alert.decisions) {
                try {
                  const existingDecision = await Decision.findOne({
                    where: { crowdsec_decision_id: decision.id }
                  });

                  if (!existingDecision) {
                    await Decision.create({
                      crowdsec_decision_id: decision.id,
                      alert_id: existingAlert.id,
                      origin: decision.origin,
                      type: decision.type,
                      scope: decision.scope,
                      value: decision.value,
                      duration: decision.duration,
                      scenario: decision.scenario,
                      simulated: decision.simulated,
                      created_at: new Date(),
                      updated_at: new Date(),
                    });
                    decisionsCount++;
                  }
                } catch (decisionError) {
                  console.error(`Error inserting decision ${decision.id}:`, decisionError);
                }
              }
            }
            continue;
          }

          // Insert new alert
          const alertInstance = await Alert.create({
            uuid: alert.uuid,
            crowdsec_alert_id: alert.id,
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
            created_at: new Date(),
            updated_at: new Date(),
          });
          synced++;

          // Insert decisions for this new alert
          if (alert.decisions && alert.decisions.length > 0) {
            for (const decision of alert.decisions) {
              try {
                // Check if decision already exists
                const existingDecision = await Decision.findOne({
                  where: { crowdsec_decision_id: decision.id }
                });

                if (!existingDecision) {
                  await Decision.create({
                    crowdsec_decision_id: decision.id,
                    alert_id: alertInstance.id,
                    origin: decision.origin,
                    type: decision.type,
                    scope: decision.scope,
                    value: decision.value,
                    duration: decision.duration,
                    scenario: decision.scenario,
                    simulated: decision.simulated,
                    created_at: new Date(),
                    updated_at: new Date(),
                  });
                  decisionsCount++;
                }
              } catch (decisionError) {
                console.error(`Error inserting decision ${decision.id}:`, decisionError);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing alert ${alert.id}:`, error);
          errors++;
        }
      }

      console.log(`✓ Alerts sync completed: ${synced} new alerts added, ${skipped} existing alerts skipped, ${decisionsCount} decisions synced, ${errors} errors`);
      return { synced, skipped, errors, decisions: decisionsCount };
    } catch (error) {
      console.error('Error syncing alerts:', error);
      return { synced: 0, skipped: 0, errors: 1, decisions: 0 };
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

export const cacheService = new CacheService();
