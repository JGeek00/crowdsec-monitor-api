import { Op } from 'sequelize';
import { Alert, Decision } from '@/models';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { calculateExpiration, calculateRetentionCutoff } from '@/utils/duration';
import { config } from '@/config';
import { AlertAttributes } from '@/models/Alert';
import { DecisionAttributes } from '@/models/Decision';
import appDefaults from '@/constants/app-defaults';

class AlertsSyncService {
  private lastSuccessfulSync: Date | null = null;

  private writeLock: Promise<void> = Promise.resolve();

  acquireWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.writeLock.then(() => fn());
    this.writeLock = next.then(() => {}, () => {});
    return next;
  }

  getLastSuccessfulSync(): Date | null {
    return this.lastSuccessfulSync;
  }

  async syncAlerts(): Promise<{ synced: number; updated: number; errors: number; decisions: number }> {
    // --- Phase 1: fetch from network (outside the lock, never blocks DB writes) ---
    let alerts: Awaited<ReturnType<typeof crowdSecAPI.alerts.getAlerts>>;
    try {
      const results = await Promise.all(appDefaults.alerts.originsFetch.map(origin => crowdSecAPI.alerts.getAlerts({ origin })));
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
            const existingAlert = await Alert.findByPk(alert.id);

            const alertData: Omit<AlertAttributes, 'created_at'> = {
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
              await existingAlert.update(alertData);
              alertInstance = existingAlert;
              updated++;
            } else {
              alertInstance = await Alert.create({ ...alertData, created_at: new Date() });
              synced++;
            }

            if (alert.decisions && alert.decisions.length > 0) {
              const lapiDecisionIds = alert.decisions.map(d => d.id);

              await Decision.destroy({
                where: { alert_id: alertInstance.id, id: { [Op.notIn]: lapiDecisionIds } },
              });

              for (const decision of alert.decisions) {
                try {
                  const existingDecision = await Decision.findByPk(decision.id);

                  const decisionData: Omit<DecisionAttributes, 'created_at'> = {
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
                    await existingDecision.update(decisionData);
                  } else {
                    await Decision.create({ ...decisionData, created_at: new Date() });
                  }
                  decisionsCount++;
                } catch (decisionError) {
                  console.error(`Error syncing decision ${decision.id}:`, decisionError);
                }
              }
            } else {
              await Decision.destroy({ where: { alert_id: alertInstance.id } });
            }
          } catch (error) {
            console.error(`Error syncing alert ${alert.id}:`, error);
            errors++;
          }
        }

        await this.cleanupOldData();
        this.lastSuccessfulSync = new Date();

        return { synced, updated, errors, decisions: decisionsCount };
      } catch (error) {
        console.error('Error syncing alerts:', error);
        return { synced: 0, updated: 0, errors: 1, decisions: 0 };
      }
    });
  }

  async cleanupOldData(): Promise<{ deletedAlerts: number; deletedDecisions: number }> {
    const cutoffDate = calculateRetentionCutoff(config.database.retention);

    if (!cutoffDate) {
      return { deletedAlerts: 0, deletedDecisions: 0 };
    }

    try {
      console.log(`Starting data cleanup for records older than ${cutoffDate.toISOString()}...`);

      const deletedDecisions = await Decision.destroy({
        where: { created_at: { [Op.lt]: cutoffDate } },
      });

      const deletedAlerts = await Alert.destroy({
        where: { created_at: { [Op.lt]: cutoffDate } },
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

  /** @deprecated Use syncAlerts() instead */
  async syncDecisions(): Promise<{ synced: number; errors: number }> {
    console.log('⚠️  syncDecisions is deprecated. Decisions are now synced with alerts.');
    return { synced: 0, errors: 0 };
  }

  async syncAll(): Promise<{ alerts: { synced: number; updated: number; errors: number; decisions: number } }> {
    const alerts = await this.syncAlerts();
    return { alerts };
  }
}

export const alertsSyncService = new AlertsSyncService();
