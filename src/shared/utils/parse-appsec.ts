import type { CrowdSecAlert, CrowdSecMeta } from '@/shared/crowdsec.types';

export interface AppSecSummary {
  rule?: string;
  uri?: string;
  host?: string;
  method?: string;
  matchedZones?: string;
  message?: string;
}

function firstValue(value?: string | string[]): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    const first = value[0];
    return first === undefined ? undefined : String(first);
  }
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      const first = Array.isArray(parsed) ? parsed[0] : undefined;
      return first === undefined ? undefined : String(first);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function metaMap(meta?: CrowdSecMeta[]): Map<string, string | undefined> {
  const map = new Map<string, string | undefined>();
  for (const item of meta ?? []) {
    if (!map.has(item.key)) map.set(item.key, firstValue(item.value));
  }
  return map;
}

export function extractAppSecSummary(alert: Pick<CrowdSecAlert, 'meta' | 'events'>): AppSecSummary | null {
  const top = metaMap(alert.meta);
  const firstEventMeta = metaMap(alert.events?.[0]?.meta);

  const rule = firstEventMeta.get('rule_name') ?? top.get('name') ?? top.get('rule_name');
  const uri = firstEventMeta.get('uri') ?? firstEventMeta.get('target_uri') ?? top.get('target_uri') ?? top.get('uri');
  const host = firstEventMeta.get('target_fqdn') ?? top.get('target_fqdn') ?? top.get('host');
  const method = top.get('method') ?? firstEventMeta.get('method');
  const matchedZones = firstEventMeta.get('matched_zones') ?? top.get('matched_zones');
  const message = firstEventMeta.get('message') ?? top.get('msg');

  if (!rule && !uri && !host && !method) return null;
  return { rule, uri, host, method, matchedZones, message };
}
