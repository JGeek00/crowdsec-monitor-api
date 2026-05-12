import { Op } from 'sequelize';
import { Alert, AlertsTable, Decision, DecisionsTable, UnparsedMetaData } from '@/models';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { calculateExpiration, calculateRetentionCutoff } from '@/utils/duration';
import { config } from '@/config';
import appDefaults from '@/constants/app-defaults';
import { log } from '@/services/log.service';

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
      log.debug(`Fetching alerts from ${appDefaults.alerts.originsFetch.length} origin(s)...`);
      const results = await Promise.all(appDefaults.alerts.originsFetch.map(origin => crowdSecAPI.alerts.getAlerts({ origin })));
      alerts = results.flat();
      log.debug(`Fetched ${alerts.length} alerts from LAPI`);
    } catch (err) {
      log.error('Error fetching alerts from LAPI:', err);
      return { synced: 0, updated: 0, errors: 1, decisions: 0 };
    }

    // --- Phase 2: write to DB (inside the lock) ---
    return this.acquireWriteLock(async () => {
      try {
        log.debug(`Writing ${alerts.length} alerts to DB...`);

        let synced = 0;
        let updated = 0;
        let errors = 0;
        let decisionsCount = 0;

        for (const alert of alerts) {
          try {
            const existingAlert = await AlertsTable.findByPk(alert.id);

            const alertData: Omit<Alert<UnparsedMetaData>, 'created_at'> = {
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
              log.debug(`  Updated alert #${alert.id} (${alert.scenario})`);
            } else {
              alertInstance = await AlertsTable.create({ ...alertData, created_at: new Date() });
              synced++;
              log.debug(`  New alert #${alert.id} (${alert.scenario})`);
            }

            if (alert.decisions && alert.decisions.length > 0) {
              const lapiDecisionIds = alert.decisions.map(d => d.id);

              const staleCount = await DecisionsTable.count({
                where: { [DecisionsTable.col.alertId]: alertInstance.id, [DecisionsTable.col.id]: { [Op.notIn]: lapiDecisionIds } },
              });

              if (staleCount > 0) {
                log.debug(`    Removing ${staleCount} stale decisions for alert #${alert.id}`);
                await DecisionsTable.destroy({
                  where: { [DecisionsTable.col.alertId]: alertInstance.id, [DecisionsTable.col.id]: { [Op.notIn]: lapiDecisionIds } },
                });
              }

              for (const decision of alert.decisions) {
                try {
                  const existingDecision = await DecisionsTable.findByPk(decision.id);

                  const decisionData: Omit<Decision, 'created_at'> = {
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
                    await DecisionsTable.create({ ...decisionData, created_at: new Date() });
                  }
                  decisionsCount++;
                } catch (decisionError) {
                  log.error(`Error syncing decision ${decision.id}:`, decisionError);
                }
              }
              log.debug(`    Synced ${alert.decisions.length} decisions for alert #${alert.id}`);
            } else {
              await DecisionsTable.destroy({ where: { [DecisionsTable.col.alertId]: alertInstance.id } });
            }
          } catch (err) {
            log.error(`Error syncing alert ${alert.id}:`, err);
            errors++;
          }
        }

        await this.cleanupOldData();
        this.lastSuccessfulSync = new Date();

        log.debug(`Sync complete: ${synced} new, ${updated} updated, ${decisionsCount} decisions, ${errors} errors`);

        return { synced, updated, errors, decisions: decisionsCount };
      } catch (err) {
        log.error('Error syncing alerts:', err);
        return { synced: 0, updated: 0, errors: 1, decisions: 0 };
      }
    });
  }

  async cleanupOldData(): Promise<{ deletedAlerts: number; deletedDecisions: number }> {
    const cutoffDate = calculateRetentionCutoff(config.database.retention);

    if (!cutoffDate) {
      log.debug('No retention configured, skipping cleanup');
      return { deletedAlerts: 0, deletedDecisions: 0 };
    }

    log.debug(`Retention cutoff: ${cutoffDate.toISOString()}`);

    try {
      log.debug(`Starting data cleanup for records older than ${cutoffDate.toISOString()}...`);

      const deletedDecisions = await DecisionsTable.destroy({
        where: { created_at: { [Op.lt]: cutoffDate } },
      });

      log.debug(`Deleted ${deletedDecisions} stale decisions`);

      const deletedAlerts = await AlertsTable.destroy({
        where: { created_at: { [Op.lt]: cutoffDate } },
      });

      log.debug(`Deleted ${deletedAlerts} stale alerts`);

      if (deletedAlerts > 0 || deletedDecisions > 0) {
        log.info(`Cleanup completed: ${deletedAlerts} alerts and ${deletedDecisions} decisions deleted`);
      }

      return { deletedAlerts, deletedDecisions };
    } catch (err) {
      log.error('Error during data cleanup:', err);
      return { deletedAlerts: 0, deletedDecisions: 0 };
    }
  }

  /** @deprecated Use syncAlerts() instead */
  async syncDecisions(): Promise<{ synced: number; errors: number }> {
    log.warn('syncDecisions is deprecated. Decisions are now synced with alerts.');
    return { synced: 0, errors: 0 };
  }

  async syncAll(): Promise<{ alerts: { synced: number; updated: number; errors: number; decisions: number } }> {
    const alerts = await this.syncAlerts();
    return { alerts };
  }
}

export const alertsSyncService = new AlertsSyncService();
