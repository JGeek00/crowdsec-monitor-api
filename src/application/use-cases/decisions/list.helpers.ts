import type { Alert_SourceInfo, Decision } from '@/domain/entities';
import type { DecisionGroup } from './decisions.dto';
import type { Pagination } from '@/shared/models';

// ─── Error ────────────────────────────────────────────────────────────────

export class PaginationError extends Error {
  constructor(offset: number, total: number) {
    super(`Invalid parameter: offset (${offset}) cannot be greater than total items (${total})`);
    this.name = 'PaginationError';
  }
}

// ─── Filtering info ───────────────────────────────────────────────────────

export type { FilteringInfo } from './decisions.dto';

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
