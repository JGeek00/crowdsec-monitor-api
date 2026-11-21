import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/infrastructure/persistence/sequelize/models', () => ({
  AlertsTable: { findByPk: vi.fn(), create: vi.fn(), destroy: vi.fn() },
  DecisionsTable: {
    findByPk: vi.fn(),
    create: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    col: { alertId: 'alert_id', id: 'id' },
  },
}));

vi.mock('@/infrastructure/crowdsec/lapi/crowdsec-api', () => ({
  crowdSecAPI: {
    alerts: { getAlerts: vi.fn() },
  },
}));

vi.mock('@/infrastructure/system/logger', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/config', () => ({
  config: { database: { retention: '30d' } },
}));

const { mockCalculateRetentionCutoff } = vi.hoisted(() => ({
  mockCalculateRetentionCutoff: vi.fn(() => new Date(Date.now() - 30 * 86400000)),
}));
vi.mock('@/shared/utils/duration', () => ({
  calculateExpiration: vi.fn(() => new Date()),
  calculateRetentionCutoff: mockCalculateRetentionCutoff,
}));

vi.mock('@/constants/app-defaults', () => ({
  default: { alerts: { originsFetch: ['crowdsec'] } },
}));

import {
  NAMED_ABBREVIATION,
  NAMED_ABBREVIATION_CANONICAL,
  DUPLICATED_OFFSET,
  DUPLICATED_OFFSET_CANONICAL,
  UNPARSEABLE,
} from '@tests/setup/timestamp-fixtures';

describe('AlertsSyncService', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('syncAlerts fetches and writes alerts', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([
      {
        id: 1,
        uuid: 'u-1',
        scenario: 'ssh-bf',
        scenario_version: '0.1',
        scenario_hash: 'h',
        message: 'msg',
        capacity: 3,
        leakspeed: '10s',
        simulated: false,
        remediation: true,
        events_count: 1,
        machine_id: 'm1',
        source: {
          ip: '1.2.3.4',
          scope: 'Ip',
          value: '1.2.3.4',
          cn: 'US',
          as_name: 'AS',
          as_number: '123',
          latitude: 0,
          longitude: 0,
          range: '',
        },
        labels: null,
        meta: [],
        events: [],
        decisions: [],
        created_at: new Date().toISOString(),
        start_at: new Date().toISOString(),
        stop_at: new Date().toISOString(),
      },
    ] as any);
    const { AlertsTable } = await import('@/infrastructure/persistence/sequelize/models');
    vi.mocked(AlertsTable.findByPk).mockResolvedValue(null);
    vi.mocked(AlertsTable.create).mockResolvedValue({ id: 1 } as any);

    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    const result = await alertsSyncService.syncAlerts();

    expect(result.synced).toBe(1);
    expect(result.errors).toBe(0);
  });

  it('syncAlerts skips blocklist alerts', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([
      {
        id: 9,
        uuid: 'u-9',
        scenario: 'external/blocklist (my-list)',
        scenario_version: '0.1',
        scenario_hash: 'h',
        message: 'blocklist',
        capacity: 1,
        leakspeed: '10s',
        simulated: false,
        remediation: true,
        events_count: 1,
        machine_id: 'm1',
        source: { ip: '9.9.9.9', scope: 'Ip', value: '9.9.9.9' },
        labels: null,
        kind: 'crowdsec',
        meta: [],
        events: [],
        decisions: [
          {
            id: 1,
            origin: 'lists',
            type: 'ban',
            scope: 'Ip',
            value: '9.9.9.9',
            duration: '24h',
            scenario: 'external/blocklist (my-list)',
            simulated: false,
          },
        ],
        created_at: new Date().toISOString(),
        start_at: new Date().toISOString(),
        stop_at: new Date().toISOString(),
      },
    ] as any);
    const { AlertsTable } = await import('@/infrastructure/persistence/sequelize/models');
    vi.mocked(AlertsTable.findByPk).mockResolvedValue(null);

    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    const result = await alertsSyncService.syncAlerts();

    expect(result.synced).toBe(0);
    expect(vi.mocked(AlertsTable.create)).not.toHaveBeenCalled();
  });

  it('syncAlerts persists AppSec summary for waf alerts', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([
      {
        id: 77,
        uuid: 'u-77',
        scenario: 'crowdsecurity/vpatch-env-access',
        scenario_version: '0.4',
        scenario_hash: 'h',
        message: 'WAF block',
        capacity: 1,
        leakspeed: '',
        simulated: false,
        remediation: true,
        events_count: 1,
        machine_id: 'm1',
        source: { ip: '1.2.3.4', scope: 'Ip', value: '1.2.3.4' },
        labels: null,
        kind: 'waf',
        meta: [
          { key: 'method', value: '["GET"]' },
          { key: 'target_uri', value: '["/.env"]' },
        ],
        events: [
          {
            timestamp: '2026-11-21 20:30:31 +0000 UTC',
            meta: [
              { key: 'rule_name', value: 'crowdsecurity/vpatch-env-access' },
              { key: 'uri', value: '/.env' },
              { key: 'target_fqdn', value: 'linkwarden.jgeek00.com' },
              { key: 'data' },
            ],
          },
        ],
        decisions: null,
        created_at: new Date().toISOString(),
        start_at: new Date().toISOString(),
        stop_at: new Date().toISOString(),
      },
    ] as any);
    const { AlertsTable } = await import('@/infrastructure/persistence/sequelize/models');
    vi.mocked(AlertsTable.findByPk).mockResolvedValue(null);
    vi.mocked(AlertsTable.create).mockResolvedValue({ id: 77 } as any);
    const { notificationEngineService } = await import('@/infrastructure/notifications/engine');
    const handleSpy = vi.spyOn(notificationEngineService, 'handleAlert').mockResolvedValue(undefined);

    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    const result = await alertsSyncService.syncAlerts();

    expect(result.synced).toBe(1);
    expect(vi.mocked(AlertsTable.create).mock.calls[0][0]).toMatchObject({
      is_appsec: true,
      appsec_rule: 'crowdsecurity/vpatch-env-access',
      appsec_uri: '/.env',
      appsec_host: 'linkwarden.jgeek00.com',
      appsec_method: 'GET',
    });
    expect(handleSpy).toHaveBeenCalledWith(
      expect.objectContaining({ appsecRule: 'crowdsecurity/vpatch-env-access', appsecHost: 'linkwarden.jgeek00.com' }),
    );
  });

  it('syncAlerts returns empty counts on fetch error', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockRejectedValue(new Error('network error'));

    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    const result = await alertsSyncService.syncAlerts();

    expect(result.synced).toBe(0);
    expect(result.errors).toBe(1);
  });

  it('acquireWriteLock serializes operations', async () => {
    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    const order: number[] = [];

    const p1 = alertsSyncService.acquireWriteLock(async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push(1);
    });
    const p2 = alertsSyncService.acquireWriteLock(async () => {
      order.push(2);
    });

    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });

  it('syncDecisions returns zero counts', async () => {
    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    const result = await alertsSyncService.syncDecisions();
    expect(result).toEqual({ synced: 0, errors: 0 });
  });

  it('syncAll delegates to syncAlerts', async () => {
    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    const result = await alertsSyncService.syncAll();
    expect(result).toHaveProperty('alerts');
  });

  it('normalizes event timestamps to canonical format before persisting (REQ-007)', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([
      {
        id: 2,
        uuid: 'u-2',
        scenario: 'ssh-bf',
        scenario_version: '0.1',
        scenario_hash: 'h',
        message: 'msg',
        capacity: 1,
        leakspeed: '0',
        simulated: false,
        remediation: true,
        events_count: 3,
        machine_id: 'm1',
        source: { ip: '1.2.3.4', scope: 'Ip', value: '1.2.3.4' },
        labels: null,
        meta: [],
        events: [
          { timestamp: NAMED_ABBREVIATION, meta: [] },
          { timestamp: DUPLICATED_OFFSET, meta: [] },
          { timestamp: UNPARSEABLE, meta: [] },
        ],
        decisions: [],
        created_at: new Date().toISOString(),
        start_at: new Date().toISOString(),
        stop_at: new Date().toISOString(),
      },
    ] as any);
    const { AlertsTable } = await import('@/infrastructure/persistence/sequelize/models');
    vi.mocked(AlertsTable.findByPk).mockResolvedValue(null);
    vi.mocked(AlertsTable.create).mockResolvedValue({ id: 2 } as any);

    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    const result = await alertsSyncService.syncAlerts();

    expect(result.synced).toBe(1);
    const calls = vi.mocked(AlertsTable.create).mock.calls;
    const created = calls[calls.length - 1][0] as any;
    expect(created.events[0].timestamp).toBe(NAMED_ABBREVIATION_CANONICAL);
    expect(created.events[1].timestamp).toBe(DUPLICATED_OFFSET_CANONICAL); // legacy duplicated-offset: re-rendered to UTC
    expect(created.events[2].timestamp).toBe(UNPARSEABLE); // unparseable: stored as received, record not dropped
  });

  it('canonicalizes event timestamps when updating an existing alert (REQ-007)', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([
      {
        id: 3,
        uuid: 'u-3',
        scenario: 'ssh-bf',
        scenario_version: '0.1',
        scenario_hash: 'h',
        message: 'msg',
        capacity: 1,
        leakspeed: '0',
        simulated: false,
        remediation: true,
        events_count: 1,
        machine_id: 'm1',
        source: { ip: '1.2.3.4', scope: 'Ip', value: '1.2.3.4' },
        labels: null,
        meta: [],
        events: [{ timestamp: NAMED_ABBREVIATION, meta: [] }],
        decisions: [],
        created_at: new Date().toISOString(),
        start_at: new Date().toISOString(),
        stop_at: new Date().toISOString(),
      },
    ] as any);
    const { AlertsTable } = await import('@/infrastructure/persistence/sequelize/models');
    const updateMock = vi.fn().mockResolvedValue({});
    vi.mocked(AlertsTable.findByPk).mockResolvedValue({ id: 3, update: updateMock } as any);

    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    await alertsSyncService.syncAlerts();

    expect(updateMock).toHaveBeenCalledTimes(1);
    const updated = updateMock.mock.calls[0][0] as any;
    expect(updated.events[0].timestamp).toBe(NAMED_ABBREVIATION_CANONICAL);
  });

  it('getLastSuccessfulSync returns null initially', async () => {
    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    expect(alertsSyncService.getLastSuccessfulSync()).toBeNull();
  });

  describe('cleanupOldData', () => {
    it('skips cleanup when no retention is configured', async () => {
      mockCalculateRetentionCutoff.mockReturnValue(null as never);

      const { alertsSyncService: svc } = await import('@/infrastructure/sync/alerts-sync');
      const result = await svc.cleanupOldData();
      expect(result).toEqual({ deletedAlerts: 0, deletedDecisions: 0 });
    });

    it('deletes old data within retention period', async () => {
      mockCalculateRetentionCutoff.mockReturnValue(new Date(Date.now() - 30 * 86400000));
      const { DecisionsTable, AlertsTable } = await import('@/infrastructure/persistence/sequelize/models');
      vi.mocked(DecisionsTable.destroy).mockResolvedValue(5);
      vi.mocked(AlertsTable.destroy).mockResolvedValue(3);

      const { alertsSyncService: svc } = await import('@/infrastructure/sync/alerts-sync');
      const result = await svc.cleanupOldData();
      expect(result).toEqual({ deletedAlerts: 3, deletedDecisions: 5 });
      expect(DecisionsTable.destroy).toHaveBeenCalled();
      expect(AlertsTable.destroy).toHaveBeenCalled();
    });

    it('handles destroy error gracefully', async () => {
      mockCalculateRetentionCutoff.mockReturnValue(new Date(Date.now() - 30 * 86400000));
      const { DecisionsTable } = await import('@/infrastructure/persistence/sequelize/models');
      vi.mocked(DecisionsTable.destroy).mockRejectedValue(new Error('db error'));

      const { alertsSyncService: svc } = await import('@/infrastructure/sync/alerts-sync');
      const result = await svc.cleanupOldData();
      expect(result).toEqual({ deletedAlerts: 0, deletedDecisions: 0 });
    });
  });

  it('syncAlerts updates existing alert when found', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([
      {
        id: 1,
        uuid: 'u-1',
        scenario: 'ssh-bf',
        scenario_version: '0.1',
        scenario_hash: 'h',
        message: 'msg',
        capacity: 3,
        leakspeed: '10s',
        simulated: false,
        remediation: true,
        events_count: 1,
        machine_id: 'm1',
        source: {
          ip: '1.2.3.4',
          scope: 'Ip',
          value: '1.2.3.4',
          cn: 'US',
          as_name: 'AS',
          as_number: '123',
          latitude: 0,
          longitude: 0,
          range: '',
        },
        labels: null,
        meta: [],
        events: [],
        decisions: [],
        created_at: new Date().toISOString(),
        start_at: new Date().toISOString(),
        stop_at: new Date().toISOString(),
      },
    ] as any);
    const { AlertsTable } = await import('@/infrastructure/persistence/sequelize/models');
    const mockUpdate = vi.fn();
    vi.mocked(AlertsTable.findByPk).mockResolvedValue({ id: 1, update: mockUpdate } as any);

    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    const result = await alertsSyncService.syncAlerts();

    expect(result.updated).toBe(1);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('syncAlerts handles individual alert sync error', async () => {
    const { crowdSecAPI } = await import('@/infrastructure/crowdsec/lapi/crowdsec-api');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockResolvedValue([
      {
        id: 1,
        uuid: 'u-1',
        scenario: 'ssh-bf',
        scenario_version: '0.1',
        scenario_hash: 'h',
        message: 'msg',
        capacity: 3,
        leakspeed: '10s',
        simulated: false,
        remediation: true,
        events_count: 1,
        machine_id: 'm1',
        source: {
          ip: '1.2.3.4',
          scope: 'Ip',
          value: '1.2.3.4',
          cn: 'US',
          as_name: 'AS',
          as_number: '123',
          latitude: 0,
          longitude: 0,
          range: '',
        },
        labels: null,
        meta: [],
        events: [],
        decisions: [],
        created_at: new Date().toISOString(),
        start_at: new Date().toISOString(),
        stop_at: new Date().toISOString(),
      },
    ] as any);
    const { AlertsTable } = await import('@/infrastructure/persistence/sequelize/models');
    vi.mocked(AlertsTable.findByPk).mockRejectedValue(new Error('find error'));

    const { alertsSyncService } = await import('@/infrastructure/sync/alerts-sync');
    const result = await alertsSyncService.syncAlerts();

    expect(result.errors).toBe(1);
    expect(result.synced).toBe(0);
  });
});
