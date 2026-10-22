import { Op, WhereOptions } from '@sequelize/core';
import { DecisionsTable } from '@/infrastructure/persistence/sequelize/models';
import type { Decision, Alert_SourceInfo } from '@/domain/entities';
import { escapeLike } from '@/shared/utils/sql';
import { DB_SORTING } from '@/infrastructure/persistence/sequelize/db.types';
import type { FilteringInfo, GetDecisionsQueryParams } from '@/application/use-cases/decisions/decisions.dto';

// ─── WHERE clause builder (Sequelize-flavored, repository-internal) ───────

export function buildDecisionsWhere(query: GetDecisionsQueryParams, hasGroup: boolean): WhereOptions<Decision> {
  const where: WhereOptions<Decision> = {};
  const { type, scope, value, simulated, scenario, ip_address, only_active, start_timestamp, end_timestamp } = query;

  // The list use case normalizes these to UTC Dates; raw wire strings are ignored here.
  if (start_timestamp instanceof Date && end_timestamp instanceof Date) {
    where.crowdsec_created_at = { [Op.gte]: start_timestamp, [Op.lte]: end_timestamp };
  } else if (start_timestamp instanceof Date) {
    where.crowdsec_created_at = { [Op.gte]: start_timestamp };
  } else if (end_timestamp instanceof Date) {
    where.crowdsec_created_at = { [Op.lte]: end_timestamp };
  }

  if (type) {
    where.type = String(type);
  }

  if (scope) {
    where.scope = String(scope);
  }

  if (value) {
    where.value = { [Op.like]: `%${escapeLike(String(value))}%` };
  }

  if (simulated !== undefined) {
    where.simulated = String(simulated) === 'true';
  }

  // only_active in DB only when not grouping — grouping evaluates per-IP in JS
  if (only_active && !hasGroup) {
    const isActive = typeof only_active === 'boolean' ? only_active : only_active === 'true';
    if (isActive) {
      where.expiration = { [Op.gt]: new Date() };
    }
  }

  if (scenario) {
    const scenarios = Array.isArray(scenario) ? scenario : [scenario];
    where.scenario = {
      [Op.or]: scenarios.map((s) => ({ [Op.like]: `%${escapeLike(String(s))}%` })),
    };
  }

  if (ip_address) {
    const ipAddresses = Array.isArray(ip_address) ? ip_address : [ip_address];
    where.value = { [Op.in]: ipAddresses.map(String) };
  }

  return where;
}

// ─── Decisions DB query config ────────────────────────────────────────────

export const DECISIONS_QUERY = {
  attributes: { exclude: [DecisionsTable.col.createdAt, DecisionsTable.col.updatedAt] },
  order: [[DecisionsTable.col.crowdsecCreatedAt, DB_SORTING.DESC]] as [string, string][],
};

// ─── Filtering options (countries / ipOwners) ─────────────────────────────

export async function fetchFilteringOptions(): Promise<FilteringInfo> {
  const rows = await DecisionsTable.findAll({
    attributes: ['source'],
    raw: true,
  });

  const countriesSet = new Set<string>();
  const ipOwnersSet = new Set<string>();

  for (const row of rows) {
    if (!row.source) continue;
    const source: Alert_SourceInfo = typeof row.source === 'string' ? JSON.parse(row.source) : row.source;

    if (source.cn) countriesSet.add(source.cn);
    if (source.as_name) ipOwnersSet.add(source.as_name);
  }

  return {
    countries: Array.from(countriesSet).sort(),
    ipOwners: Array.from(ipOwnersSet).sort(),
  };
}
