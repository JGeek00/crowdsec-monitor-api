import { Op, WhereOptions } from 'sequelize';
import {
  Alert_SourceInfo,
  Decision,
  DecisionGroup,
  DecisionsTable,
  GetDecisionsQueryParams,
  Pagination,
} from '@/models';
import { escapeLike } from '@/utils/sql';
import { DB_SORTING } from '@/types/database.types';

// ─── Error ────────────────────────────────────────────────────────────────

export class PaginationError extends Error {
  constructor(offset: number, total: number) {
    super(`Invalid parameter: offset (${offset}) cannot be greater than total items (${total})`);
    this.name = 'PaginationError';
  }
}

// ─── WHERE clause builder ─────────────────────────────────────────────────

export function buildDecisionsWhere(query: GetDecisionsQueryParams, hasGroup: boolean): WhereOptions<Decision> {
  const where: WhereOptions<Decision> = {};
  const { type, scope, value, simulated, scenario, ip_address, only_active } = query;

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

// ─── Filtering options (countries / ipOwners) ─────────────────────────────

export interface FilteringInfo {
  countries: string[];
  ipOwners: string[];
}

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

// ─── JavaScript-side filters (country / ip_owner on JSON columns) ─────────

export function applyJsFilters(decisions: Decision[], country?: string, ip_owner?: string): Decision[] {
  let result = decisions;

  if (country) {
    const countries = Array.isArray(country) ? country : [country];
    const upperCountries = countries.map((c) => String(c).toUpperCase());
    result = result.filter((d) => d.source?.cn && upperCountries.includes(d.source.cn.toUpperCase()));
  }

  if (ip_owner) {
    const owners = Array.isArray(ip_owner) ? ip_owner : [ip_owner];
    result = result.filter(
      (d) => d.source?.as_name && owners.some((o) => d.source.as_name!.toLowerCase().includes(String(o).toLowerCase())),
    );
  }

  return result;
}

// ─── Group decisions by source IP ─────────────────────────────────────────

export function groupDecisionsByIp(
  decisions: Decision[],
  onlyActive: boolean | undefined,
  withDecisions: boolean,
): DecisionGroup[] {
  const now = new Date();
  const map = new Map<string, { source: Alert_SourceInfo; decisions: Decision[]; activeCount: number }>();

  for (const d of decisions) {
    const ip = d.source?.ip;
    if (!ip) continue;

    if (!map.has(ip)) {
      map.set(ip, { source: d.source, decisions: [], activeCount: 0 });
    }

    const entry = map.get(ip)!;
    entry.decisions.push(d);
    if (d.expiration && new Date(d.expiration) > now) {
      entry.activeCount++;
    }
  }

  const groups: DecisionGroup[] = [];
  for (const [ip, entry] of map) {
    const s = entry.source;
    const group: DecisionGroup = {
      ip,
      country: s.cn,
      owner: s.as_name,
      as_number: s.as_number,
      latitude: s.latitude,
      longitude: s.longitude,
      range: s.range,
      active_decisions: entry.activeCount,
      total_decisions: entry.decisions.length,
    };

    if (withDecisions) {
      group.decisions = onlyActive
        ? entry.decisions.filter((d) => d.expiration && new Date(d.expiration) > now)
        : entry.decisions;
    }

    groups.push(group);
  }

  return groups;
}

// ─── Pagination + response meta ───────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  pagination?: Pagination;
  total?: number;
}

export function buildPaginatedResponse<T>(
  items: T[],
  limit: number,
  offset: number,
  unpaged: boolean,
): PaginatedResult<T> {
  const total = items.length;

  if (!unpaged && offset > total) {
    throw new PaginationError(offset, total);
  }

  const paginated = unpaged ? items : items.slice(offset, offset + limit);

  if (unpaged) {
    return { items: paginated, total };
  }

  return {
    items: paginated,
    pagination: {
      page: Math.floor(offset / limit) + 1,
      amount: paginated.length,
      total,
    },
  };
}

// ─── Decisions DB query config ────────────────────────────────────────────

export const DECISIONS_QUERY = {
  attributes: { exclude: [DecisionsTable.col.createdAt, DecisionsTable.col.updatedAt] },
  order: [[DecisionsTable.col.crowdsecCreatedAt, DB_SORTING.DESC]] as [string, string][],
};
