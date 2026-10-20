import { Op, WhereOptions } from '@sequelize/core';
import { AlertsTable, DecisionsTable } from '@/models/db';
import type { Alert, Alert_EventData, Alert_SourceInfo, UnparsedMetaData } from '@/models';
import { AlertMapper } from '../mappers/alert.mapper';
import type {
  AlertFilters,
  AlertPage,
  AlertRepository as AlertRepositoryPort,
} from '@/application/ports/alert-repository.port';
import { escapeLike } from '@/shared/utils/sql';
import { DB_SORTING } from '@/types/database.types';

type Row = Alert<UnparsedMetaData>;

const asArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * Sequelize implementation of the AlertRepository port.
 * Owns the JSON-column filtering that used to live in the alerts list controller.
 */
export class SequelizeAlertRepository implements AlertRepositoryPort {
  async findWithFilters(filters: AlertFilters): Promise<AlertPage> {
    const { limit = 100, offset = 0, unpaged = false, scenario, simulated } = filters;

    const where: WhereOptions<Row> = {};

    if (scenario) {
      const scenarios = asArray(scenario);
      where.scenario = {
        [Op.or]: scenarios.map((s) => ({ [Op.like]: `%${escapeLike(String(s))}%` })),
      };
    }

    if (simulated !== undefined) {
      where.simulated = String(simulated) === 'true';
    }

    // Facets: extracted from the entire table (same as legacy controller).
    const allAlerts = await AlertsTable.findAll({
      attributes: [AlertsTable.col.scenario, AlertsTable.col.source, AlertsTable.col.events],
      raw: true,
    });

    const countriesSet = new Set<string>();
    const scenariosSet = new Set<string>();
    const ipOwnersSet = new Set<string>();
    const targetsSet = new Set<string>();

    allAlerts.forEach((alert) => {
      if (alert.scenario) {
        scenariosSet.add(alert.scenario);
      }
      if (alert.source) {
        const source = AlertMapper.parseJson<Alert_SourceInfo>(alert.source);
        if (source.cn) countriesSet.add(source.cn);
        if (source.as_name) ipOwnersSet.add(source.as_name);
      }
      if (alert.events) {
        const events = AlertMapper.parseJson<Alert_EventData<UnparsedMetaData>[]>(alert.events);
        if (Array.isArray(events)) {
          events.forEach((event) => {
            if (event.meta && Array.isArray(event.meta)) {
              event.meta.forEach((metaItem) => {
                if (metaItem.key === 'target_fqdn' && metaItem.value) {
                  targetsSet.add(metaItem.value);
                }
              });
            }
          });
        }
      }
    });

    let alerts = await AlertsTable.findAll({
      where,
      attributes: {
        exclude: [AlertsTable.col.createdAt, AlertsTable.col.updatedAt],
      },
      order: [[AlertsTable.col.crowdsecCreatedAt, DB_SORTING.DESC]],
    });

    // JSON-column filters (in memory, same semantics as the legacy controller).
    const ipAddresses = asArray(filters.ip_address);
    if (ipAddresses.length > 0) {
      alerts = alerts.filter((alert) => alert.source && ipAddresses.includes(alert.source.ip));
    }

    const countries = asArray(filters.country);
    if (countries.length > 0) {
      const upperCountries = countries.map((c) => String(c).toUpperCase());
      alerts = alerts.filter(
        (alert) => alert.source && alert.source.cn && upperCountries.includes(alert.source.cn.toUpperCase()),
      );
    }

    const owners = asArray(filters.ip_owner);
    if (owners.length > 0) {
      alerts = alerts.filter(
        (alert) =>
          alert.source &&
          alert.source.as_name &&
          owners.some((owner) => alert.source.as_name?.toLowerCase().includes(String(owner).toLowerCase())),
      );
    }

    const targets = asArray(filters.target);
    if (targets.length > 0) {
      alerts = alerts.filter((alert) => {
        if (alert.events && Array.isArray(alert.events)) {
          return alert.events.some((event) => {
            if (event.meta && Array.isArray(event.meta)) {
              return event.meta.some(
                (metaItem) => metaItem.key === 'target_fqdn' && metaItem.value && targets.includes(metaItem.value),
              );
            }
            return false;
          });
        }
        return false;
      });
    }

    const total = alerts.length;

    let paginatedAlerts = alerts;
    if (!unpaged) {
      paginatedAlerts = alerts.slice(offset, offset + limit);
    }

    return {
      items: paginatedAlerts.map((alert) => AlertMapper.toResponse(alert.toJSON() as Row)),
      total,
      filtering: {
        countries: Array.from(countriesSet).sort(),
        scenarios: Array.from(scenariosSet).sort(),
        ipOwners: Array.from(ipOwnersSet).sort(),
        targets: Array.from(targetsSet).sort(),
      },
    };
  }

  async findById(id: number): Promise<Row | null> {
    const row = await AlertsTable.findByPk(id);
    return row ? (row.toJSON() as Row) : null;
  }

  /** Persists one LAPI alert and its decisions (sync write path). */
  async upsertBatch(alerts: unknown[]): Promise<number> {
    let count = 0;
    for (const alert of alerts as Row[]) {
      const existing = await AlertsTable.findByPk(alert.id);
      if (existing) {
        await existing.update(alert);
      } else {
        await AlertsTable.create(alert as Row);
      }
      count++;
    }
    return count;
  }

  async deleteById(id: number): Promise<boolean> {
    const deleted = await AlertsTable.destroy({ where: { [AlertsTable.col.id]: id } });
    return deleted > 0;
  }

  /** Retention cleanup: stale decisions first, then stale alerts (same order as legacy cleanupOldData). */
  async deleteOlderThan(cutoff: Date): Promise<number> {
    const deletedDecisions = await DecisionsTable.destroy({
      where: { created_at: { [Op.lt]: cutoff } },
    });
    const deletedAlerts = await AlertsTable.destroy({
      where: { created_at: { [Op.lt]: cutoff } },
    });
    return deletedDecisions + deletedAlerts;
  }

  async findDecisionsByAlertId(alertId: number) {
    return DecisionsTable.findAll({ where: { [DecisionsTable.col.alertId]: alertId } });
  }

  async findDecisions() {
    return DecisionsTable.findAll();
  }

  /** Aggregations for the alerts stats endpoint (same queries as legacy controller). */
  async getStats() {
    const total = (await AlertsTable.count()) as number;
    const simulated = (await AlertsTable.count({ where: { simulated: true } })) as number;

    const topScenarios = (await AlertsTable.findAll({
      attributes: [
        AlertsTable.col.scenario,
        [AlertsTable.sequelize!.fn('COUNT', AlertsTable.sequelize!.col(AlertsTable.col.id)), 'count'],
      ],
      group: [AlertsTable.col.scenario],
      order: [[AlertsTable.sequelize!.fn('COUNT', AlertsTable.sequelize!.col(AlertsTable.col.id)), DB_SORTING.DESC]],
      limit: 10,
      raw: true,
    })) as unknown as { scenario: string; count: number }[];

    const sourceRows = await AlertsTable.findAll({
      attributes: [AlertsTable.col.source],
      raw: true,
    });

    const sources = sourceRows.map((row) => {
      const source = AlertMapper.parseJson<Alert_SourceInfo | null>(row.source);
      return { cn: source?.cn, as_name: source?.as_name };
    });

    return { total, simulated, topScenarios, sources };
  }
}
