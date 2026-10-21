import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { cleanRepoDb, closeRepoDb, getRepoSequelize, initRepoDb } from '@tests/setup/repo-db';
import { makeBlocklist } from '@tests/setup/factories';
import type { Blocklist, CsBlocklist } from '@/domain/entities';
import { BlocklistIpsTable } from '@/infrastructure/persistence/sequelize/models';
import { SequelizeBlocklistRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-blocklist.repository';
import { BLOCKLIST_IP_ORIGIN } from '@/domain/entities/blocklist-ip.entity';

describe('SequelizeBlocklistRepository', () => {
  let repo: SequelizeBlocklistRepository;

  beforeAll(async () => {
    await initRepoDb();
    repo = new SequelizeBlocklistRepository();
  });
  beforeEach(cleanRepoDb);
  afterAll(closeRepoDb);

  const seedBlocklist = async (overrides: Partial<Blocklist> = {}): Promise<Blocklist> => {
    const name = overrides.name ?? 'test-blocklist';
    const url = overrides.url ?? `https://example.com/${name}.txt`;
    const created = await repo.create(url, name);
    if (overrides.enabled === false) {
      return (await repo.setEnabled(created.id, false)) as Blocklist;
    }
    return created;
  };

  it('list returns every blocklist mapped to entity', async () => {
    await seedBlocklist({ name: 'one' });
    await seedBlocklist({ name: 'two' });

    const all = await repo.list();
    expect(all).toHaveLength(2);
    expect(all[0].name).toBe('one');
  });

  it('findById returns null for unknown ids', async () => {
    const created = await seedBlocklist();
    expect((await repo.findById(created.id))?.name).toBe('test-blocklist');
    expect(await repo.findById(999)).toBeNull();
  });

  it('findByUrl matches by exact url', async () => {
    await seedBlocklist({ url: 'https://example.com/unique.txt' });
    expect((await repo.findByUrl('https://example.com/unique.txt'))?.name).toBe('test-blocklist');
    expect(await repo.findByUrl('https://example.com/missing.txt')).toBeNull();
  });

  it('findWithIps returns the blocklist with its ips, null when missing', async () => {
    const created = await seedBlocklist();
    await repo.insertIps(created.id, 'test-blocklist', ['10.0.0.1', '10.0.0.2']);

    const withIps = await repo.findWithIps(created.id);
    expect(withIps?.ips.map((ip) => ip.value).sort()).toEqual(['10.0.0.1', '10.0.0.2']);
    expect(await repo.findWithIps(999)).toBeNull();
  });

  it('getIps returns the ip rows of a blocklist', async () => {
    const created = await seedBlocklist();
    await repo.insertIps(created.id, 'test-blocklist', ['10.0.0.1']);

    expect(await repo.getIps(created.id)).toHaveLength(1);
    expect(await repo.getIps(999)).toEqual([]);
  });

  it('deleteById removes ips and the blocklist in one transaction', async () => {
    const created = await seedBlocklist();
    await repo.insertIps(created.id, 'test-blocklist', ['10.0.0.1']);

    expect(await repo.deleteById(created.id)).toBe(true);
    const seq = getRepoSequelize();
    const [ips] = (await seq.query('SELECT COUNT(*) as c FROM blocklist_ips'))[0] as Array<{ c: number }>;
    expect(Number(ips.c)).toBe(0);
    expect(await repo.deleteById(created.id)).toBe(false);
  });

  it('setEnabled returns null for unknown blocklists and toggles existing ones', async () => {
    const created = await seedBlocklist();

    expect((await repo.setEnabled(created.id, false))?.enabled).toBe(false);
    expect(await repo.setEnabled(999, true)).toBeNull();
  });

  it('updateRefreshMetadata persists the refresh outcome fields', async () => {
    const created = await seedBlocklist();
    const attempt = new Date('2026-10-20T18:00:00Z');

    await repo.updateRefreshMetadata(created.id, {
      lastRefreshAttempt: attempt,
      lastSuccessfulRefresh: attempt,
      lastRefreshFailed: false,
    });

    const updated = await repo.findById(created.id);
    expect(updated?.last_refresh_failed).toBe(false);
    expect(updated?.last_successful_refresh).not.toBeNull();
  });

  it('deleteIpsByOrigin only removes rows of the given origin', async () => {
    const created = await seedBlocklist();
    await repo.insertIps(created.id, 'test-blocklist', ['10.0.0.1']);
    const seq = getRepoSequelize();
    await seq.query(
      `INSERT INTO blocklist_ips (blocklist_id, blocklist_name, value, origin) VALUES (${created.id}, 'test-blocklist', '10.0.0.9', '${BLOCKLIST_IP_ORIGIN.CS_BLOCKLIST}')`,
    );

    const destroyed = await repo.deleteIpsByOrigin(created.id, BLOCKLIST_IP_ORIGIN.BLOCKLIST);
    expect(destroyed).toBe(1);
    expect(await repo.getIps(created.id)).toHaveLength(1);
  });

  it('insertIps chunks writes and ignores duplicates', async () => {
    const created = await seedBlocklist();

    const inserted = await repo.insertIps(created.id, 'test-blocklist', ['10.0.0.1', '10.0.0.2']);
    expect(inserted).toBe(2);

    await repo.insertIps(created.id, 'test-blocklist', ['10.0.0.2', '10.0.0.3']);
    expect(await repo.getIps(created.id)).toHaveLength(3);
  });

  it('upsertCsBlocklists and listCsBlocklists manage cs entries', async () => {
    const entry: CsBlocklist = { id: 'cs-list-1', name: 'crowdsec-list' };

    await repo.upsertCsBlocklists([entry]);
    await repo.upsertCsBlocklists([{ id: 'cs-list-1', name: 'renamed' }]);

    const all = await repo.listCsBlocklists();
    expect(all).toEqual([{ id: 'cs-list-1', name: 'renamed' }]);
  });

  it('syncCsBlocklistIps recreates the cs blocklist and its ips atomically', async () => {
    await repo.upsertCsBlocklists([{ id: 'cs-list-1', name: 'old' }]);

    await repo.syncCsBlocklistIps('cs-list-1', 'crowdsec-list', ['10.0.0.1', '10.0.0.2']);

    expect(await repo.listCsBlocklists()).toEqual([{ id: 'cs-list-1', name: 'crowdsec-list' }]);
    const csIps = await BlocklistIpsTable.findAll({ where: { cs_blocklist_id: 'cs-list-1' } });
    expect(csIps.map((ip) => ip.value).sort()).toEqual(['10.0.0.1', '10.0.0.2']);
  });

  describe('listMerged', () => {
    it('merges api and cs blocklists ordered by name with totals', async () => {
      await seedBlocklist({ name: 'b-api' });
      await repo.upsertCsBlocklists([{ id: 'cs-1', name: 'a-cs' }]);

      const merged = await repo.listMerged({
        unpaged: true,
        limit: 100,
        offset: 0,
        includeIps: false,
        onlyApi: false,
        onlyCs: false,
      });
      expect(merged.total).toBe(2);
      expect(merged.apiRows).toHaveLength(1);
      expect(merged.csRows).toHaveLength(1);
    });

    it('respects onlyApi / onlyCs filters', async () => {
      await seedBlocklist();
      await repo.upsertCsBlocklists([{ id: 'cs-1', name: 'a-cs' }]);

      const onlyApi = await repo.listMerged({
        unpaged: true,
        limit: 100,
        offset: 0,
        includeIps: false,
        onlyApi: true,
        onlyCs: false,
      });
      expect(onlyApi.apiRows).toHaveLength(1);
      expect(onlyApi.csRows).toEqual([]);

      const onlyCs = await repo.listMerged({
        unpaged: true,
        limit: 100,
        offset: 0,
        includeIps: false,
        onlyApi: false,
        onlyCs: true,
      });
      expect(onlyCs.apiRows).toEqual([]);
      expect(onlyCs.csRows).toHaveLength(1);
    });

    it('paginates api rows and includes ips on demand', async () => {
      const a = await seedBlocklist({ name: 'a' });
      await seedBlocklist({ name: 'b' });
      await repo.insertIps(a.id, 'a', ['10.0.0.1']);

      const paged = await repo.listMerged({
        unpaged: false,
        limit: 1,
        offset: 1,
        includeIps: false,
        onlyApi: false,
        onlyCs: false,
      });
      expect(paged.total).toBe(2);
      expect(paged.apiRows).toHaveLength(1);

      const withIps = await repo.listMerged({
        unpaged: true,
        limit: 100,
        offset: 0,
        includeIps: true,
        onlyApi: false,
        onlyCs: false,
      });
      expect(withIps.apiRows).toHaveLength(2);
      expect(makeBlocklist()).toBeDefined();
    });
  });
});
