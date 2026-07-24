import type {
  Alert,
  Alert_SourceInfo,
  Alert_EventData,
  UnparsedMetaData,
  Decision,
  Blocklist,
  BlocklistIp,
  CsBlocklist,
  GetAlertsQueryParams,
  GetDecisionsQueryParams,
} from '@/models';
import type { CrowdSecAllowlist, CrowdSecLoginResponse } from '@/types/crowdsec.types';

export type Factory<T> = (overrides?: Partial<T>) => T;

const defaultSource: Alert_SourceInfo = {
  ip: '1.2.3.4',
  scope: 'Ip',
  value: '1.2.3.4',
  cn: 'US',
  as_name: 'EXAMPLE-AS',
  as_number: '12345',
  latitude: 40.7128,
  longitude: -74.006,
  range: '1.2.3.0/24',
};

let alertCounter = 0;
export const makeAlert: Factory<Alert<UnparsedMetaData>> = (overrides: Partial<Alert<UnparsedMetaData>> = {}) => {
  alertCounter++;
  return {
    id: 1,
    uuid: `abc12345-1234-5678-9abc-def01234${String(alertCounter).padStart(4, '0')}`,
    scenario: 'crowdsec/ssh-bf',
    scenario_version: '0.1',
    scenario_hash: 'hash123',
    message: 'SSH bruteforce detected',
    capacity: 3,
    leakspeed: '10s',
    simulated: false,
    remediation: true,
    events_count: 1,
    machine_id: 'test-machine',
    source: { ...defaultSource },
    labels: null,
    meta: [{ key: 'source_type', value: 'ssh' }],
    events: [{ timestamp: new Date().toISOString(), meta: [{ key: 'event_type', value: 'connection' }] }],
    crowdsec_created_at: new Date('2026-07-23T00:00:00Z'),
    start_at: new Date('2026-07-23T00:00:00Z'),
    stop_at: new Date('2026-07-23T01:00:00Z'),
    created_at: new Date('2026-07-23T00:00:00Z'),
    updated_at: new Date('2026-07-23T00:00:00Z'),
    ...overrides,
  };
};

export const makeDecision: Factory<Decision> = (overrides = {}) => ({
  id: 1,
  alert_id: 1,
  origin: 'crowdsec',
  type: 'ban',
  scope: 'Ip',
  value: '1.2.3.4',
  expiration: new Date('2026-07-23T04:00:00Z'),
  scenario: 'crowdsec/ssh-bf',
  simulated: false,
  source: { ...defaultSource },
  crowdsec_created_at: new Date('2026-07-23T00:00:00Z'),
  created_at: new Date('2026-07-23T00:00:00Z'),
  updated_at: new Date('2026-07-23T00:00:00Z'),
  ...overrides,
});

export const makeBlocklist: Factory<Blocklist> = (overrides = {}) => ({
  id: 1,
  url: 'https://example.com/blocklist.txt',
  name: 'test-blocklist',
  enabled: true,
  added_date: new Date('2026-07-23T00:00:00Z'),
  last_refresh_attempt: null,
  last_successful_refresh: null,
  last_refresh_failed: null,
  ...overrides,
});

export const makeBlocklistIp: Factory<BlocklistIp> = (overrides = {}) => ({
  id: 1,
  blocklist_id: 1,
  cs_blocklist_id: null,
  blocklist_name: 'test-blocklist',
  value: '10.0.0.1',
  origin: 'blocklist',
  ...overrides,
});

export const makeCsBlocklist: Factory<CsBlocklist> = (overrides = {}) => ({
  id: 'crowdsec-test-list',
  name: 'crowdsec-blocklist',
  ...overrides,
});

// ponytail: minimal CrowdSec allowlist factory — matches CrowdSecAllowlist shape
export const makeAllowlist: Factory<CrowdSecAllowlist> = (overrides = {}) => ({
  created_at: '2026-07-23T00:00:00Z',
  description: 'Test allowlist',
  items: [
    {
      created_at: '2026-07-23T00:00:00Z',
      expiration: null,
      value: '192.168.1.1',
    },
  ],
  name: 'test-allowlist',
  updated_at: '2026-07-23T00:00:00Z',
  ...overrides,
});

export const makeLoginResponse: Factory<CrowdSecLoginResponse> = (overrides = {}) => ({
  code: 200,
  expire: new Date(Date.now() + 3600000).toISOString(),
  token: 'test-token-abc123',
  ...overrides,
});

export const makeAlertsRequest: Factory<GetAlertsQueryParams> = (overrides = {}) => ({
  limit: 100,
  offset: 0,
  ...overrides,
});

export const makeDecisionsRequest: Factory<GetDecisionsQueryParams> = (overrides = {}) => ({
  limit: 100,
  offset: 0,
  ...overrides,
});
