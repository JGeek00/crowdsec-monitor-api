import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/models', () => ({
  AlertsTable: { findByPk: vi.fn(), create: vi.fn(), destroy: vi.fn() },
  DecisionsTable: {
    findByPk: vi.fn(),
    create: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    col: { alertId: 'alert_id', id: 'id' },
  },
}));

vi.mock('@/services/crowdsec-api.service', () => ({
  crowdSecAPI: {
    alerts: { getAlerts: vi.fn() },
  },
}));

vi.mock('@/services/log.service', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/config', () => ({
  config: { database: { retention: '30d' } },
}));

const { mockCalculateRetentionCutoff } = vi.hoisted(() => ({
  mockCalculateRetentionCutoff: vi.fn(() => new Date(Date.now() - 30 * 86400000)),
}));
vi.mock('@/utils/duration', () => ({
  calculateExpiration: vi.fn(() => new Date()),
  calculateRetentionCutoff: mockCalculateRetentionCutoff,
}));

vi.mock('@/constants/app-defaults', () => ({
  default: { alerts: { originsFetch: ['crowdsec'] } },
}));

describe('AlertsSyncService', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('syncAlerts fetches and writes alerts', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
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
    const { AlertsTable } = await import('@/models');
    vi.mocked(AlertsTable.findByPk).mockResolvedValue(null);
    vi.mocked(AlertsTable.create).mockResolvedValue({ id: 1 } as any);

    const { alertsSyncService } = await import('@/services/alerts-sync.service');
    const result = await alertsSyncService.syncAlerts();

    expect(result.synced).toBe(1);
    expect(result.errors).toBe(0);
  });

  it('syncAlerts returns empty counts on fetch error', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
    vi.mocked(crowdSecAPI.alerts.getAlerts).mockRejectedValue(new Error('network error'));

    const { alertsSyncService } = await import('@/services/alerts-sync.service');
    const result = await alertsSyncService.syncAlerts();

    expect(result.synced).toBe(0);
    expect(result.errors).toBe(1);
  });

  it('acquireWriteLock serializes operations', async () => {
    const { alertsSyncService } = await import('@/services/alerts-sync.service');
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
    const { alertsSyncService } = await import('@/services/alerts-sync.service');
    const result = await alertsSyncService.syncDecisions();
    expect(result).toEqual({ synced: 0, errors: 0 });
  });

  it('syncAll delegates to syncAlerts', async () => {
    const { alertsSyncService } = await import('@/services/alerts-sync.service');
    const result = await alertsSyncService.syncAll();
    expect(result).toHaveProperty('alerts');
  });

  it('getLastSuccessfulSync returns null initially', async () => {
    const { alertsSyncService } = await import('@/services/alerts-sync.service');
    expect(alertsSyncService.getLastSuccessfulSync()).toBeNull();
  });

  describe('cleanupOldData', () => {
    it('skips cleanup when no retention is configured', async () => {
      mockCalculateRetentionCutoff.mockReturnValue(null);

      const { alertsSyncService: svc } = await import('@/services/alerts-sync.service');
      const result = await svc.cleanupOldData();
      expect(result).toEqual({ deletedAlerts: 0, deletedDecisions: 0 });
    });

    it('deletes old data within retention period', async () => {
      mockCalculateRetentionCutoff.mockReturnValue(new Date(Date.now() - 30 * 86400000));
      const { DecisionsTable, AlertsTable } = await import('@/models');
      vi.mocked(DecisionsTable.destroy).mockResolvedValue(5);
      vi.mocked(AlertsTable.destroy).mockResolvedValue(3);

      const { alertsSyncService: svc } = await import('@/services/alerts-sync.service');
      const result = await svc.cleanupOldData();
      expect(result).toEqual({ deletedAlerts: 3, deletedDecisions: 5 });
      expect(DecisionsTable.destroy).toHaveBeenCalled();
      expect(AlertsTable.destroy).toHaveBeenCalled();
    });

    it('handles destroy error gracefully', async () => {
      mockCalculateRetentionCutoff.mockReturnValue(new Date(Date.now() - 30 * 86400000));
      const { DecisionsTable } = await import('@/models');
      vi.mocked(DecisionsTable.destroy).mockRejectedValue(new Error('db error'));

      const { alertsSyncService: svc } = await import('@/services/alerts-sync.service');
      const result = await svc.cleanupOldData();
      expect(result).toEqual({ deletedAlerts: 0, deletedDecisions: 0 });
    });
  });

  it('syncAlerts updates existing alert when found', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
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
    const { AlertsTable } = await import('@/models');
    const mockUpdate = vi.fn();
    vi.mocked(AlertsTable.findByPk).mockResolvedValue({ id: 1, update: mockUpdate } as any);

    const { alertsSyncService } = await import('@/services/alerts-sync.service');
    const result = await alertsSyncService.syncAlerts();

    expect(result.updated).toBe(1);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('syncAlerts handles individual alert sync error', async () => {
    const { crowdSecAPI } = await import('@/services/crowdsec-api.service');
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
    const { AlertsTable } = await import('@/models');
    vi.mocked(AlertsTable.findByPk).mockRejectedValue(new Error('find error'));

    const { alertsSyncService } = await import('@/services/alerts-sync.service');
    const result = await alertsSyncService.syncAlerts();

    expect(result.errors).toBe(1);
    expect(result.synced).toBe(0);
  });
});
