import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models', () => ({
  BLOCKLIST_IP_ORIGIN: { BLOCKLIST: 'blocklist' },
  BlocklistIpsTable: {
    destroy: vi.fn(),
    findAll: vi.fn(),
    bulkCreate: vi.fn(),
    col: { blocklistId: 'blocklist_id', id: 'id' },
  },
  BlocklistsTable: {},
}));

vi.mock('@/config/database', () => ({
  sequelize: { transaction: vi.fn() },
}));

vi.mock('@/config/env-defaults', () => ({
  defaults: { blocklists: { writeChunkSize: 1000 } },
}));

vi.mock('@/services/log.service', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('BlocklistDbService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writeIpsToDb destroys old IPs and bulk-creates new ones', async () => {
    const { sequelize } = await import('@/config/database');
    const mockTransaction = vi.fn();
    vi.mocked(sequelize.transaction).mockImplementation(async (cb: any) => cb({}));

    const { BlocklistIpsTable } = await import('@/models');
    vi.mocked(BlocklistIpsTable.destroy).mockResolvedValue(0);
    vi.mocked(BlocklistIpsTable.bulkCreate).mockResolvedValue([] as any);

    const { blocklistDbService } = await import('@/services/blocklists/blocklist-db.service');
    await blocklistDbService.writeIpsToDb({ id: 1, name: 'test' } as any, ['1.2.3.4']);

    expect(BlocklistIpsTable.destroy).toHaveBeenCalled();
    expect(BlocklistIpsTable.bulkCreate).toHaveBeenCalled();
  });

  it('deleteBlocklistIps deletes in chunks', async () => {
    const { sequelize } = await import('@/config/database');
    vi.mocked(sequelize.transaction).mockImplementation(async (cb: any) => cb({}));
    const { BlocklistIpsTable } = await import('@/models');

    const mockChunk = [{ id: 1 }, { id: 2 }];
    vi.mocked(BlocklistIpsTable.findAll)
      .mockResolvedValueOnce(mockChunk as any)
      .mockResolvedValueOnce([]);
    vi.mocked(BlocklistIpsTable.destroy).mockResolvedValue(2);

    const { blocklistDbService } = await import('@/services/blocklists/blocklist-db.service');
    const result = await blocklistDbService.deleteBlocklistIps({ id: 1, name: 'test' } as any);

    expect(result).toBe(2);
  });

  it('updateRefreshMetadata calls blocklist.update', async () => {
    const { blocklistDbService } = await import('@/services/blocklists/blocklist-db.service');
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const blocklist = { id: 1, name: 'test', update: mockUpdate } as any;

    await blocklistDbService.updateRefreshMetadata(blocklist, {
      last_refresh_attempt: new Date(),
      last_refresh_failed: false,
    });

    expect(mockUpdate).toHaveBeenCalled();
  });
});
