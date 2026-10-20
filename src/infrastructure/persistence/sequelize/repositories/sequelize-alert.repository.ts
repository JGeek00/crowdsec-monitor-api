import { Op, WhereOptions, QueryTypes } from '@sequelize/core';
import { AlertsTable, DecisionsTable } from '@/infrastructure/persistence/sequelize/models';
import type { Alert, Alert_EventData, Alert_SourceInfo } from '@/domain/entities';
import type { UnparsedMetaData } from '@/shared/models';
import { AlertMapper } from '../mappers/alert.mapper';
import type {
  AlertFilters,
  AlertPage,
  AlertRepository as AlertRepositoryPort,
} from '@/application/ports/alert-repository.port';
import { escapeLike } from '@/shared/utils/sql';
import { DB_SORTING } from '@/types/database.types';
import { defaults } from '@/config/env-defaults';

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

  // ── Statistics aggregations (moved from statistics controllers) ──

  async getTopCountries() {
    const rows = await AlertsTable.findAll({ attributes: ['source'], raw: true });
    const countryMap = new Map<string, number>();
    rows.forEach((alert) => {
      if (!alert.source) return;
      const source = AlertMapper.parseJson<Alert_SourceInfo>(alert.source);
      if (source.cn) countryMap.set(source.cn, (countryMap.get(source.cn) || 0) + 1);
    });
    return Array.from(countryMap.entries())
      .map(([countryCode, amount]) => ({ countryCode, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  async getCountryHistory(countryCode: string) {
    const rows = await AlertsTable.findAll({
      attributes: [AlertsTable.col.crowdsecCreatedAt, AlertsTable.col.source],
      raw: true,
    });
    return this.groupDatesBy(rows as unknown as Record<string, unknown>[], (alert) => {
      const source = AlertMapper.parseJson<Alert_SourceInfo>(alert.source);
      return source.cn && source.cn.toUpperCase() === countryCode ? this.toDateKey(alert.crowdsec_created_at) : null;
    });
  }

  async getTopIpOwners() {
    const rows = await AlertsTable.findAll({ attributes: ['source'], raw: true });
    const ipOwnerMap = new Map<string, number>();
    rows.forEach((alert) => {
      if (!alert.source) return;
      const source = AlertMapper.parseJson<Alert_SourceInfo>(alert.source);
      if (source.as_name) ipOwnerMap.set(source.as_name, (ipOwnerMap.get(source.as_name) || 0) + 1);
    });
    return Array.from(ipOwnerMap.entries())
      .map(([ipOwner, amount]) => ({ ipOwner, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  async getIpOwnerHistory(ipOwner: string) {
    const rows = await AlertsTable.findAll({
      attributes: [AlertsTable.col.crowdsecCreatedAt, AlertsTable.col.source],
      raw: true,
    });
    return this.groupDatesBy(rows as unknown as Record<string, unknown>[], (alert) => {
      const source = AlertMapper.parseJson<Alert_SourceInfo>(alert.source);
      return source.as_name && source.as_name === ipOwner ? this.toDateKey(alert.crowdsec_created_at) : null;
    });
  }

  async getTopScenarios() {
    const rows = await AlertsTable.findAll({
      attributes: [
        'scenario',
        [AlertsTable.sequelize!.fn('COUNT', AlertsTable.sequelize!.col(AlertsTable.col.id)), 'count'],
      ],
      group: ['scenario'],
      order: [[AlertsTable.sequelize!.fn('COUNT', AlertsTable.sequelize!.col(AlertsTable.col.id)), 'DESC' as never]],
      raw: true,
    });
    return (rows as unknown as { scenario: string; count: string }[]).map((item) => ({
      scenario: item.scenario,
      amount: parseInt(item.count, 10),
    }));
  }

  async getScenarioHistory(scenario: string) {
    return AlertsTable.sequelize!.query(
      `SELECT 
        DATE(crowdsec_created_at) as date,
        COUNT(*) as amount
      FROM alerts
      WHERE scenario = :scenario
      GROUP BY DATE(crowdsec_created_at)
      ORDER BY date ASC`,
      { replacements: { scenario }, type: QueryTypes.SELECT },
    ) as Promise<{ date: string; amount: number }[]>;
  }

  async getTopTargets() {
    const rows = await AlertsTable.findAll({ attributes: ['events'], raw: true });
    const targetMap = new Map<string, number>();
    rows.forEach((alert) => {
      if (!alert.events) return;
      const events = AlertMapper.parseJson<Alert_EventData<UnparsedMetaData>[]>(alert.events);
      const targetsInAlert = new Set<string>();
      if (Array.isArray(events)) {
        events.forEach((event) => {
          if (event.meta && Array.isArray(event.meta)) {
            event.meta.forEach((metaItem) => {
              if (metaItem.key === 'target_fqdn' && metaItem.value) targetsInAlert.add(metaItem.value);
            });
          }
        });
      }
      targetsInAlert.forEach((target) => targetMap.set(target, (targetMap.get(target) || 0) + 1));
    });
    return Array.from(targetMap.entries())
      .map(([target, amount]) => ({ target, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  async getTargetHistory(target: string) {
    const rows = await AlertsTable.findAll({
      attributes: [AlertsTable.col.crowdsecCreatedAt, AlertsTable.col.events],
      raw: true,
    });
    return this.groupDatesBy(rows as unknown as Record<string, unknown>[], (alert) => {
      if (!alert.events) return null;
      const events = AlertMapper.parseJson<Alert_EventData<UnparsedMetaData>[]>(alert.events);
      let hasTarget = false;
      if (Array.isArray(events)) {
        for (const event of events) {
          if (event.meta && Array.isArray(event.meta)) {
            for (const metaItem of event.meta) {
              if (metaItem.key === 'target_fqdn' && metaItem.value === target) {
                hasTarget = true;
                break;
              }
            }
          }
          if (hasTarget) break;
        }
      }
      return hasTarget ? this.toDateKey(alert.crowdsec_created_at) : null;
    });
  }

  private toDateKey(value: unknown): string {
    return new Date(value as Date | string).toISOString().split('T')[0];
  }

  private groupDatesBy<T extends Record<string, unknown>>(rows: T[], dateOf: (alert: T) => string | null) {
    const dateMap = new Map<string, number>();
    rows.forEach((alert) => {
      const date = dateOf(alert);
      if (date) dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });
    return Array.from(dateMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getGeneralStats(since: string | undefined, limit: number | undefined) {
    const topLimit = limit ?? defaults.statistics.topItemsLimit;
    let sinceDate: Date | undefined;
    if (since && typeof since === 'string') {
      sinceDate = new Date(since);
      sinceDate.setHours(0, 0, 0, 0);
    }

    const whereClauseAlerts = sinceDate ? { [AlertsTable.col.crowdsecCreatedAt]: { [Op.gte]: sinceDate } } : {};
    const whereClauseDecisions = sinceDate ? { [DecisionsTable.col.crowdsecCreatedAt]: { [Op.gte]: sinceDate } } : {};

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const alertsLast24Hours = (await AlertsTable.count({
      where: { [AlertsTable.col.crowdsecCreatedAt]: { [Op.gte]: twentyFourHoursAgo } },
    })) as number;

    const now = new Date();
    const activeDecisions = (await DecisionsTable.count({
      where: {
        expiration: { [Op.gt]: now },
        ...(sinceDate ? { [DecisionsTable.col.crowdsecCreatedAt]: { [Op.gte]: sinceDate } } : {}),
      },
    })) as number;

    const dateFn = (table: typeof AlertsTable | typeof DecisionsTable, col: string) =>
      table.sequelize!.fn('DATE', table.sequelize!.col(col));

    const alertsByDate = (await AlertsTable.findAll({
      attributes: [
        [dateFn(AlertsTable, AlertsTable.col.crowdsecCreatedAt), 'date'],
        [AlertsTable.sequelize!.fn('COUNT', AlertsTable.sequelize!.col(AlertsTable.col.id)), 'count'],
      ],
      where: whereClauseAlerts,
      group: [dateFn(AlertsTable, AlertsTable.col.crowdsecCreatedAt)],
      order: [[dateFn(AlertsTable, AlertsTable.col.crowdsecCreatedAt), 'ASC' as never]],
      raw: true,
    })) as unknown as { date: string; count: string }[];

    const decisionsByDate = (await DecisionsTable.findAll({
      attributes: [
        [dateFn(DecisionsTable, DecisionsTable.col.crowdsecCreatedAt), 'date'],
        [DecisionsTable.sequelize!.fn('COUNT', DecisionsTable.sequelize!.col(DecisionsTable.col.id)), 'count'],
      ],
      where: whereClauseDecisions,
      group: [dateFn(DecisionsTable, DecisionsTable.col.crowdsecCreatedAt)],
      order: [[dateFn(DecisionsTable, DecisionsTable.col.crowdsecCreatedAt), 'ASC' as never]],
      raw: true,
    })) as unknown as { date: string; count: string }[];

    const activityMap = new Map<string, { amountAlerts: number; amountDecisions: number }>();
    alertsByDate.forEach((item) => {
      activityMap.set(item.date, { amountAlerts: parseInt(item.count, 10), amountDecisions: 0 });
    });
    decisionsByDate.forEach((item) => {
      const existing = activityMap.get(item.date) || { amountAlerts: 0, amountDecisions: 0 };
      existing.amountDecisions = parseInt(item.count, 10);
      activityMap.set(item.date, existing);
    });
    const activityHistory = Array.from(activityMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top countries / ipOwners / targets from source+events
    const alertsWithSource = await AlertsTable.findAll({
      attributes: ['source', 'events'],
      where: whereClauseAlerts,
      raw: true,
    });

    const countryMap = new Map<string, number>();
    const ipOwnerMap = new Map<string, number>();
    const targetMap = new Map<string, number>();

    alertsWithSource.forEach((alert) => {
      if (alert.source) {
        const source = AlertMapper.parseJson<Alert_SourceInfo>(alert.source);
        if (source.cn) countryMap.set(source.cn, (countryMap.get(source.cn) || 0) + 1);
        if (source.as_name) ipOwnerMap.set(source.as_name, (ipOwnerMap.get(source.as_name) || 0) + 1);
      }
      if (alert.events) {
        const events = AlertMapper.parseJson<Alert_EventData<UnparsedMetaData>[]>(alert.events);
        const targetsInAlert = new Set<string>();
        if (Array.isArray(events)) {
          events.forEach((event) => {
            if (event.meta && Array.isArray(event.meta)) {
              event.meta.forEach((metaItem) => {
                if (metaItem.key === 'target_fqdn' && metaItem.value) targetsInAlert.add(metaItem.value);
              });
            }
          });
        }
        targetsInAlert.forEach((target) => targetMap.set(target, (targetMap.get(target) || 0) + 1));
      }
    });

    const top = (map: Map<string, number>, amount: number) =>
      Array.from(map.entries())
        .map(([item, count]) => ({ item, amount: count }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, amount);

    const scenariosData = (await AlertsTable.findAll({
      attributes: ['scenario', [AlertsTable.sequelize!.fn('COUNT', AlertsTable.sequelize!.col('id')), 'count']],
      where: whereClauseAlerts,
      group: ['scenario'],
      order: [[AlertsTable.sequelize!.fn('COUNT', AlertsTable.sequelize!.col('id')), 'DESC' as never]],
      limit: topLimit,
      raw: true,
    })) as unknown as { scenario: string; count: string }[];

    const topScenarios = scenariosData.map((item) => ({
      scenario: item.scenario,
      amount: parseInt(item.count, 10),
    }));

    return {
      alertsLast24Hours,
      activeDecisions,
      activityHistory,
      topCountries: top(countryMap, topLimit),
      topScenarios,
      topIpOwners: top(ipOwnerMap, topLimit),
      topTargets: top(targetMap, topLimit),
    };
  }
}
