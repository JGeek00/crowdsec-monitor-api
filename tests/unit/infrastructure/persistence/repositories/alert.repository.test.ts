import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { cleanRepoDb, closeRepoDb, getRepoSequelize, initRepoDb } from '@tests/setup/repo-db';
import { makeAlert, makeDecision } from '@tests/setup/factories';
import type { Alert, Alert_EventData } from '@/domain/entities';
import type { UnparsedMetaData } from '@/shared/models';
import { SequelizeAlertRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-alert.repository';

describe('SequelizeAlertRepository', () => {
  let repo: SequelizeAlertRepository;

  beforeAll(async () => {
    await initRepoDb();
    repo = new SequelizeAlertRepository();
  });
  beforeEach(cleanRepoDb);

  const seed = async (alerts: Alert<UnparsedMetaData>[]) => {
    await repo.upsertBatch(alerts);
  };

  describe('findWithFilters', () => {
    it('returns all alerts with facets and pagination by default', async () => {
      await seed([makeAlert({ id: 1 }), makeAlert({ id: 2, scenario: 'http-cve' })]);

      const page = await repo.findWithFilters({});
      expect(page.total).toBe(2);
      expect(page.items).toHaveLength(2);
      expect(page.filtering.scenarios.sort()).toEqual(['crowdsec/ssh-bf', 'http-cve']);
      expect(page.filtering.countries).toEqual(['US']);
      expect(page.filtering.ipOwners).toEqual(['EXAMPLE-AS']);
    });

    it('collects targets from event metadata facets', async () => {
      const base = makeAlert({ id: 1 });
      const events = base.events as Alert_EventData<UnparsedMetaData>[];
      await seed([{ ...base, events: [{ ...events[0], meta: [{ key: 'target_fqdn', value: 'example.com' }] }] }]);

      const page = await repo.findWithFilters({});
      expect(page.filtering.targets).toEqual(['example.com']);
    });

    it('filters by scenario with partial match', async () => {
      await seed([makeAlert({ id: 1, scenario: 'crowdsec/ssh-bf' }), makeAlert({ id: 2, scenario: 'http-cve' })]);

      const page = await repo.findWithFilters({ scenario: 'ssh' });
      expect(page.total).toBe(1);
    });

    it('filters by simulated flag', async () => {
      await seed([makeAlert({ id: 1, simulated: false }), makeAlert({ id: 2, simulated: true })]);

      expect((await repo.findWithFilters({ simulated: 'true' })).total).toBe(1);
      expect((await repo.findWithFilters({ simulated: 'false' })).total).toBe(1);
    });

    it('filters by source ip address', async () => {
      await seed([
        makeAlert({ id: 1, source: { ...makeAlert().source, ip: '1.2.3.4' } }),
        makeAlert({ id: 2, source: { ...makeAlert().source, ip: '5.6.7.8' } }),
      ]);

      const page = await repo.findWithFilters({ ip_address: ['1.2.3.4'] });
      expect(page.total).toBe(1);
    });

    it('filters by country case-insensitively', async () => {
      await seed([
        makeAlert({ id: 1, source: { ...makeAlert().source, cn: 'US' } }),
        makeAlert({ id: 2, source: { ...makeAlert().source, cn: 'FR' } }),
      ]);

      expect((await repo.findWithFilters({ country: ['us'] })).total).toBe(1);
      expect((await repo.findWithFilters({ country: ['XX'] })).total).toBe(0);
    });

    it('filters by ip owner with case-insensitive substring', async () => {
      await seed([
        makeAlert({ id: 1, source: { ...makeAlert().source, as_name: 'EXAMPLE-AS' } }),
        makeAlert({ id: 2, source: { ...makeAlert().source, as_name: 'OTHER-AS' } }),
      ]);

      expect((await repo.findWithFilters({ ip_owner: ['example'] })).total).toBe(1);
    });

    it('filters by target fqdn present in event metadata', async () => {
      const base = makeAlert({ id: 1 });
      const events = base.events as Alert_EventData<UnparsedMetaData>[];
      await seed([
        { ...base, events: [{ ...events[0], meta: [{ key: 'target_fqdn', value: 'good.com' }] }] },
        makeAlert({ id: 2 }),
      ]);

      expect((await repo.findWithFilters({ target: ['good.com'] })).total).toBe(1);
      expect((await repo.findWithFilters({ target: ['bad.com'] })).total).toBe(0);
    });

    it('paginates with offset and limit', async () => {
      await seed([makeAlert({ id: 1 }), makeAlert({ id: 2 }), makeAlert({ id: 3 })]);

      const page = await repo.findWithFilters({ limit: 2, offset: 1 });
      expect(page.total).toBe(3);
      expect(page.items).toHaveLength(2);

      const unpaged = await repo.findWithFilters({ limit: 2, offset: 1, unpaged: true });
      expect(unpaged.items).toHaveLength(3);
    });
  });

  describe('crud', () => {
    it('findById returns the alert or null', async () => {
      await seed([makeAlert({ id: 7 })]);
      expect((await repo.findById(7))?.id).toBe(7);
      expect(await repo.findById(999)).toBeNull();
    });

    it('findByIds returns [] for an empty list and matches existing ids', async () => {
      await seed([makeAlert({ id: 1 }), makeAlert({ id: 2 })]);
      expect(await repo.findByIds([])).toEqual([]);
      const rows = await repo.findByIds([1, 2]);
      expect(rows).toHaveLength(2);
    });

    it('upsertBatch inserts new alerts and updates existing ones', async () => {
      await seed([makeAlert({ id: 1, message: 'first' })]);
      await seed([makeAlert({ id: 1, message: 'updated' }), makeAlert({ id: 2 })]);

      const seq = getRepoSequelize();
      const [row] = (await seq.query('SELECT message FROM alerts WHERE id = 1'))[0] as Array<{ message: string }>;
      expect(row.message).toBe('updated');

      const [count] = (await seq.query('SELECT COUNT(*) as c FROM alerts'))[0] as Array<{ c: number }>;
      expect(Number(count.c)).toBe(2);
    });

    it('deleteById returns whether the row existed', async () => {
      await seed([makeAlert({ id: 1 })]);
      expect(await repo.deleteById(1)).toBe(true);
      expect(await repo.deleteById(1)).toBe(false);
    });

    it('deleteOlderThan removes stale decisions first, then stale alerts', async () => {
      await seed([makeAlert({ id: 1 })]);
      const seq = getRepoSequelize();
      await seq.query(
        "INSERT INTO decisions (id, alert_id, origin, type, scope, value, expiration, scenario, simulated, source, crowdsec_created_at, created_at, updated_at) VALUES (1, 1, 'crowdsec', 'ban', 'Ip', '1.2.3.4', date('now','+1 day'), 'crowdsec/ssh-bf', 0, '{}', '2020-01-01', '2020-01-01', '2020-01-01')",
      );

      const deleted = await repo.deleteOlderThan(new Date('2027-01-01'));
      expect(deleted).toBeGreaterThanOrEqual(2);
      const [decisions] = (await seq.query('SELECT COUNT(*) as c FROM decisions'))[0] as Array<{ c: number }>;
      expect(Number(decisions.c)).toBe(0);
    });

    it('findDecisionsByAlertId and findDecisions expose the decision rows', async () => {
      await seed([makeAlert({ id: 1 })]);
      await getRepoSequelize().query(
        "INSERT INTO decisions (id, alert_id, origin, type, scope, value, expiration, scenario, simulated, source, crowdsec_created_at, created_at, updated_at) VALUES (1, 1, 'crowdsec', 'ban', 'Ip', '1.2.3.4', date('now','+1 day'), 'crowdsec/ssh-bf', 0, '{}', '2026-07-23', '2026-07-23', '2026-07-23')",
      );

      expect(await repo.findDecisionsByAlertId(1)).toHaveLength(1);
      expect(await repo.findDecisionsByAlertId(2)).toHaveLength(0);
      expect(await repo.findDecisions()).toHaveLength(1);
    });
  });

  describe('aggregations', () => {
    beforeEach(async () => {
      await seed([
        makeAlert({ id: 1 }),
        makeAlert({ id: 2, simulated: true, scenario: 'http-cve' }),
        makeAlert({ id: 3, source: { ...makeAlert().source, cn: 'FR', as_name: 'OTHER-AS' } }),
      ]);
    });

    it('getStats totals, simulates and ranks scenarios', async () => {
      const stats = await repo.getStats();
      expect(stats.total).toBe(3);
      expect(stats.simulated).toBe(1);
      expect(stats.topScenarios[0]).toEqual({ scenario: 'crowdsec/ssh-bf', amount: 2 });
      expect(stats.sources).toHaveLength(3);
    });

    it('getTopCountries ranks countries by alerts', async () => {
      const top = await repo.getTopCountries();
      expect(top[0]).toEqual({ countryCode: 'US', amount: 2 });
    });

    it('getTopIpOwners ranks owners by alerts', async () => {
      const top = await repo.getTopIpOwners();
      expect(top[0]).toEqual({ ipOwner: 'EXAMPLE-AS', amount: 2 });
    });

    it('getTopScenarios counts per scenario', async () => {
      const top = await repo.getTopScenarios();
      expect(top).toEqual([
        { scenario: 'crowdsec/ssh-bf', amount: 2 },
        { scenario: 'http-cve', amount: 1 },
      ]);
    });

    it('history queries group by day', async () => {
      expect(await repo.getCountryHistory('US')).toEqual([{ date: '2026-07-23', amount: 2 }]);
      expect(await repo.getCountryHistory('XX')).toEqual([]);
      expect(await repo.getIpOwnerHistory('EXAMPLE-AS')).toEqual([{ date: '2026-07-23', amount: 2 }]);
      expect(await repo.getScenarioHistory('http-cve')).toEqual([{ date: '2026-07-23', amount: 1 }]);
    });

    it('getGeneralStats merges alert and decision activity history', async () => {
      const seq = getRepoSequelize();
      await seq.query(
        "INSERT INTO decisions (id, alert_id, origin, type, scope, value, expiration, scenario, simulated, source, crowdsec_created_at, created_at, updated_at) VALUES (1, 1, 'crowdsec', 'ban', 'Ip', '1.2.3.4', date('now','+1 day'), 'crowdsec/ssh-bf', 0, '{}', '2026-07-23', '2026-07-23', '2026-07-23')",
      );

      const stats = await repo.getGeneralStats(undefined, 10);
      expect(stats.topCountries[0]).toEqual({ item: 'US', amount: 2 });
      expect(stats.topScenarios).toHaveLength(2);
      expect(stats.activityHistory).toEqual([
        { date: '2026-07-23', amountAlerts: 3, amountDecisions: 1 },
      ]);
    });

    it('getGeneralStats respects the since filter', async () => {
      const stats = await repo.getGeneralStats('2030-01-01', 10);
      expect(stats.topCountries).toEqual([]);
      expect(stats.activityHistory).toEqual([]);
    });
  });
});

// makeDecision imported to keep the factory dependency explicit for future decision fixtures
void makeDecision;

// Single file-level close: the hoisted in-memory DB is shared by both suites
afterAll(closeRepoDb);

describe('facet extraction on malformed rows', () => {
  let repo: SequelizeAlertRepository;
  beforeAll(() => {
    // the in-memory DB was already synced by the suite above
    repo = new SequelizeAlertRepository();
  });
  beforeEach(cleanRepoDb);

  const seedEdgeRows = async () => {
    // Raw inserts bypass the model's JSON shape — the facet extraction must
    // tolerate whatever a broken LAPI sync could leave behind.
    const seq = getRepoSequelize();
    const insert = (id: number, source: string, events: string) =>
      seq.query(
        `INSERT INTO alerts (id, uuid, scenario, scenario_version, scenario_hash, message, capacity, leakspeed, simulated, remediation, events_count, machine_id, source, labels, meta, events, crowdsec_created_at, start_at, stop_at, created_at, updated_at)
         VALUES (${id}, 'edge-${id}', 'crowdsec/ssh-bf', '0.1', 'h', 'm', 0, '0', 0, 1, 0, 'm', '${source}', NULL, '[]', '${events}', '2026-07-23T00:00:00', '2026-07-23T00:00:00', '2026-07-23T01:00:00', '2026-07-23T00:00:00', '2026-07-23T00:00:00')`,
      );
    await insert(2, '{"cn":"US","as_name":"EXAMPLE-AS","ip":"1.2.3.4"}', '{"nope":true}'); // events non-array
    await insert(3, '{}', '[{"meta":"no"}]'); // source without fields, event meta non-array
    await insert(4, '{}', '[{"meta":[{"key":"other","value":"x"}]}]'); // no target_fqdn
    await insert(5, '{"as_name":"OTHER-AS"}', '[{"meta":[{"key":"target_fqdn","value":""}]}]'); // empty target
  };

  it('facets tolerate missing fields and still extract valid data', async () => {
    await seedEdgeRows();
    const page = await repo.findWithFilters({});
    expect(page.total).toBe(4);
    expect(page.filtering.scenarios).toEqual(['crowdsec/ssh-bf']);
    expect(page.filtering.countries).toEqual(['US']);
    expect(page.filtering.ipOwners).toEqual(['EXAMPLE-AS', 'OTHER-AS']);
  });

  it('target filter tolerates malformed events', async () => {
    await seedEdgeRows();
    expect((await repo.findWithFilters({ target: ['example.com'] })).total).toBe(0);
  });

  it('top countries and ip owners tolerate empty source objects', async () => {
    await seedEdgeRows();
    const countries = await repo.getTopCountries();
    expect(countries[0].countryCode).toBe('US');
    const owners = await repo.getTopIpOwners();
    expect(owners[0].ipOwner).toBe('EXAMPLE-AS');
  });

  it('getTargetHistory matches the target in any event position', async () => {
    const base = makeAlert({ id: 9 });
    const events = base.events as Alert_EventData<UnparsedMetaData>[];
    await repo.upsertBatch([
      {
        ...base,
        events: [
          { timestamp: events[0].timestamp, meta: [{ key: 'event_type', value: 'connection' }] },
          { timestamp: events[0].timestamp, meta: [{ key: 'target_fqdn', value: 'late.com' }] },
        ],
      },
    ]);

    expect(await repo.getTargetHistory('late.com')).toEqual([{ date: '2026-07-23', amount: 1 }]);
    expect(await repo.getTargetHistory('missing.com')).toEqual([]);
  });

  it('getGeneralStats merges alert and decision activity on distinct dates', async () => {
    const seq = getRepoSequelize();
    await repo.upsertBatch([makeAlert({ id: 1 })]);
    // decision on a date with no alerts (new activity entry branch)
    await seq.query(
      "INSERT INTO decisions (id, alert_id, origin, type, scope, value, expiration, scenario, simulated, source, crowdsec_created_at, created_at, updated_at) VALUES (5, 1, 'crowdsec', 'ban', 'Ip', '1.2.3.4', date('now','+1 day'), 'crowdsec/ssh-bf', 0, '{}', '2026-07-24', '2026-07-24', '2026-07-24')",
    );

    const stats = await repo.getGeneralStats(undefined, 1);
    expect(stats.activityHistory).toEqual([
      { date: '2026-07-23', amountAlerts: 1, amountDecisions: 0 },
      { date: '2026-07-24', amountAlerts: 0, amountDecisions: 1 },
    ]);
    // topLimit=1 slices each top list to one item
    expect(stats.topCountries).toHaveLength(1);
  });
});

describe('event edge rows and top-list ties', () => {
  let repo: SequelizeAlertRepository;
  beforeAll(() => {
    repo = new SequelizeAlertRepository();
  });
  beforeEach(cleanRepoDb);

  it('events without a meta key are tolerated everywhere', async () => {
    const seq = getRepoSequelize();
    await seq.query(
      `INSERT INTO alerts (id, uuid, scenario, scenario_version, scenario_hash, message, capacity, leakspeed, simulated, remediation, events_count, machine_id, source, labels, meta, events, crowdsec_created_at, start_at, stop_at, created_at, updated_at)
       VALUES (1, 'edge-1', 'crowdsec/ssh-bf', '0.1', 'h', 'm', 0, '0', 0, 1, 0, 'm', '{"cn":"US","as_name":"EXAMPLE-AS","ip":"1.2.3.4"}', NULL, '[]', '[{}]', '2026-07-23T00:00:00', '2026-07-23T00:00:00', '2026-07-23T01:00:00', '2026-07-23T00:00:00', '2026-07-23T00:00:00')`,
    );

    const page = await repo.findWithFilters({});
    expect(page.total).toBe(1);
    expect((await repo.getTopTargets())).toEqual([]);
    expect(await repo.getTargetHistory('example.com')).toEqual([]);
  });

  it('top lists break ties deterministically', async () => {
    await repo.upsertBatch([makeAlert({ id: 1 }), makeAlert({ id: 2, source: { ...makeAlert().source, cn: 'FR', as_name: 'OTHER-AS' } })]);

    const stats = await repo.getGeneralStats(undefined, 10);
    // two countries with amount 1: comparator returns 0 on ties
    expect(stats.topCountries).toHaveLength(2);
    expect(stats.topIpOwners).toHaveLength(2);
  });
});
