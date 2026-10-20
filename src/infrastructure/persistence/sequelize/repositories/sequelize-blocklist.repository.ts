import { FindAndCountOptions } from '@sequelize/core';
import { BlocklistsTable, BlocklistIpsTable, CsBlocklistsTable } from '@/models/db';
import { BLOCKLIST_IP_ORIGIN } from '@/models';
import { DB_SORTING } from '@/types/database.types';
import {
  BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE,
  BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE,
  BLOCKLISTS_IPS_INCLUDE_OPTION,
} from '@/infrastructure/persistence/sequelize/blocklist-db-queries';
import type { Blocklist } from '@/domain/entities/blocklist.entity';
import type { BlocklistIp } from '@/domain/entities/blocklist-ip.entity';
import type { CsBlocklist } from '@/domain/entities/cs-blocklist.entity';
import type { BlocklistWithIps } from '@/application/ports/blocklist-repository.port';
import { sequelize } from '@/config/database';
import { defaults } from '@/config/env-defaults';
import appDefaults from '@/constants/app-defaults';
import { BlocklistMapper } from '../mappers/blocklist.mapper';
import { AsyncWriteLock } from '@/shared/async-write-lock';
import type { BlocklistRepository as BlocklistRepositoryPort } from '@/application/ports/blocklist-repository.port';

const writeLock = new AsyncWriteLock();

/**
 * Sequelize implementation of the BlocklistRepository port.
 * Aggregate root (R3): a blocklist includes its IP rows; CS blocklists
 * (origin cs_*) are managed through the same aggregate helpers.
 */
export class SequelizeBlocklistRepository implements BlocklistRepositoryPort {
  async list(): Promise<Blocklist[]> {
    const rows = await BlocklistsTable.findAll();
    return rows.map((row) => BlocklistMapper.toEntity(row.toJSON() as Blocklist));
  }

  async findById(id: number): Promise<Blocklist | null> {
    const row = await BlocklistsTable.findByPk(id);
    return row ? BlocklistMapper.toEntity(row.toJSON() as Blocklist) : null;
  }

  async findByUrl(url: string): Promise<Blocklist | null> {
    const row = await BlocklistsTable.findOne({ where: { [BlocklistsTable.col.url]: url } });
    return row ? BlocklistMapper.toEntity(row.toJSON() as Blocklist) : null;
  }

  async findWithIps(id: number): Promise<BlocklistWithIps | null> {
    const row = await BlocklistsTable.findByPk(id, {
      include: [
        { model: BlocklistIpsTable, as: 'blocklistIps', attributes: { exclude: ['created_at', 'updated_at'] } },
      ],
    });
    if (!row) return null;
    const plain = row.toJSON() as Blocklist & { blocklistIps?: BlocklistIp[] };
    return {
      ...BlocklistMapper.toEntity(plain),
      ips: (plain.blocklistIps ?? []).map((ip: BlocklistIp) => BlocklistMapper.ipToEntity(ip)),
    };
  }

  async getIps(blocklistId: number): Promise<BlocklistIp[]> {
    const rows = await BlocklistIpsTable.findAll({
      where: { [BlocklistIpsTable.col.blocklistId]: blocklistId },
    });
    return rows.map((row) => BlocklistMapper.ipToEntity(row.toJSON() as BlocklistIp));
  }

  async create(url: string, name: string): Promise<Blocklist> {
    const row = await BlocklistsTable.create({ url, name, added_date: new Date() });
    return BlocklistMapper.toEntity(row.toJSON() as Blocklist);
  }

  async deleteById(id: number): Promise<boolean> {
    return sequelize.transaction(async (t) => {
      await BlocklistIpsTable.destroy({ where: { [BlocklistIpsTable.col.blocklistId]: id }, transaction: t });
      const deleted = await BlocklistsTable.destroy({ where: { [BlocklistsTable.col.id]: id }, transaction: t });
      return deleted > 0;
    });
  }

  async setEnabled(id: number, enabled: boolean): Promise<Blocklist | null> {
    const row = await BlocklistsTable.findByPk(id);
    if (!row) return null;
    await row.update({ enabled });
    return BlocklistMapper.toEntity(row.toJSON() as Blocklist);
  }

  async updateRefreshMetadata(
    id: number,
    meta: {
      lastRefreshAttempt: Date;
      lastSuccessfulRefresh: Date | null;
      lastRefreshFailed: boolean;
    },
  ): Promise<void> {
    await writeLock.acquire(() =>
      BlocklistsTable.update(
        {
          last_refresh_attempt: meta.lastRefreshAttempt,
          last_successful_refresh: meta.lastSuccessfulRefresh,
          last_refresh_failed: meta.lastRefreshFailed,
        },
        { where: { [BlocklistsTable.col.id]: id } },
      ),
    );
  }

  /** Deletes existing managed IP rows of a blocklist (refresh pipeline `delete` stage). */
  async deleteIpsByOrigin(blocklistId: number, origin: string): Promise<number> {
    const destroyed = await BlocklistIpsTable.destroy({
      where: { [BlocklistIpsTable.col.blocklistId]: blocklistId, [BlocklistIpsTable.col.origin]: origin },
    });
    return destroyed;
  }

  /** Chunked bulk-insert of IP rows for a blocklist (refresh pipeline `import` stage). */
  async insertIps(blocklistId: number, blocklistName: string, values: string[]): Promise<number> {
    const dbChunkSize = defaults.blocklists.writeChunkSize;
    await writeLock.acquire(async () => {
      for (let i = 0; i < values.length; i += dbChunkSize) {
        const chunk = values.slice(i, i + dbChunkSize).map((value) => ({
          blocklist_id: blocklistId,
          blocklist_name: blocklistName,
          value,
          origin: BLOCKLIST_IP_ORIGIN.BLOCKLIST,
        }));
        await BlocklistIpsTable.bulkCreate(chunk, { ignoreDuplicates: true });
      }
    });
    return values.length;
  }

  async upsertCsBlocklists(entries: CsBlocklist[]): Promise<void> {
    for (const entry of entries) {
      await CsBlocklistsTable.upsert({ id: entry.id, name: entry.name });
    }
  }

  async listCsBlocklists(): Promise<CsBlocklist[]> {
    const rows = await CsBlocklistsTable.findAll();
    return rows.map((row) => ({ id: row.id, name: row.name }));
  }

  /** Recreates the IP set of a CS blocklist inside one transaction (legacy cs-sync write path). */
  async syncCsBlocklistIps(csBlocklistId: string, blocklistName: string, values: string[]): Promise<void> {
    await writeLock.acquire(async () => {
      await sequelize.transaction(async (t) => {
        await CsBlocklistsTable.destroy({ where: { id: csBlocklistId }, transaction: t });
        await CsBlocklistsTable.create({ id: csBlocklistId, name: blocklistName }, { transaction: t });

        const chunkSize = appDefaults.blocklists.csBlocklistDbWriteChunkSize;
        for (let i = 0; i < values.length; i += chunkSize) {
          const chunk = values.slice(i, i + chunkSize).map((value) => ({
            cs_blocklist_id: csBlocklistId,
            blocklist_name: blocklistName,
            value,
            origin: BLOCKLIST_IP_ORIGIN.CS_BLOCKLIST,
          }));
          await BlocklistIpsTable.bulkCreate(chunk, { transaction: t, ignoreDuplicates: true });
        }
      });
    });
  }

  /** Merged listing (api first, then cs) with the exact query semantics of the legacy controller. */
  async listMerged(opts: {
    unpaged: boolean;
    limit: number;
    offset: number;
    includeIps: boolean;
    onlyApi: boolean;
    onlyCs: boolean;
  }) {
    const includeOption = opts.includeIps ? [BLOCKLISTS_IPS_INCLUDE_OPTION] : [];

    const [totalApi, totalCs] = await Promise.all([
      opts.onlyCs ? Promise.resolve(0) : BlocklistsTable.count(),
      opts.onlyApi ? Promise.resolve(0) : CsBlocklistsTable.count(),
    ]);
    const total = totalApi + totalCs;

    let apiRows: BlocklistsTable[] = [];
    let csRows: CsBlocklistsTable[] = [];

    if (opts.unpaged) {
      [apiRows, csRows] = await Promise.all([
        opts.onlyCs
          ? Promise.resolve([])
          : BlocklistsTable.findAll({
              attributes: { include: [BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE] },
              order: [[BlocklistsTable.col.name, DB_SORTING.ASC]],
              include: includeOption,
            }),
        opts.onlyApi
          ? Promise.resolve([])
          : CsBlocklistsTable.findAll({
              attributes: { include: [BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE] },
              order: [[CsBlocklistsTable.col.name, DB_SORTING.ASC]],
              include: includeOption,
            }),
      ]);
    } else {
      const apiOffset = opts.offset;
      const apiLimit = opts.onlyCs ? 0 : Math.max(0, Math.min(opts.limit, totalApi - apiOffset));
      const csOffset = Math.max(0, opts.offset - totalApi);
      const csLimit = opts.onlyApi ? 0 : opts.limit - apiLimit;

      await Promise.all([
        apiLimit > 0
          ? BlocklistsTable.findAll({
              attributes: { include: [BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE] },
              order: [[BlocklistsTable.col.name, DB_SORTING.ASC]],
              include: includeOption,
              limit: apiLimit,
              offset: apiOffset,
            }).then((rows) => {
              apiRows = rows;
            })
          : Promise.resolve(),
        csLimit > 0
          ? CsBlocklistsTable.findAll({
              attributes: { include: [BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE] },
              order: [[CsBlocklistsTable.col.name, DB_SORTING.ASC]],
              include: includeOption,
              limit: csLimit,
              offset: csOffset,
            }).then((rows) => {
              csRows = rows;
            })
          : Promise.resolve(),
      ]);
    }

    return { apiRows, csRows, total };
  }

  /** Detail by id ('crowdsec-' prefix → cs-managed); includes ips when requested. */
  async findByIdMerged(id: string, opts: { includeIps: boolean }) {
    const isCsId = id.startsWith('crowdsec-');

    if (isCsId) {
      const csBlocklist = await CsBlocklistsTable.findByPk(id, {
        attributes: { include: [BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE] },
      });
      if (!csBlocklist) return null;

      const ips = opts.includeIps
        ? await BlocklistIpsTable.findAll({
            where: { [BlocklistIpsTable.col.csBlocklistId]: id },
            order: [['id', DB_SORTING.ASC]],
            raw: true,
          })
        : null;

      return { type: 'cs' as const, data: csBlocklist.toJSON(), ips };
    }

    const numId = Number(id);
    const apiBlocklist = await BlocklistsTable.findByPk(numId, {
      attributes: { include: [BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE] },
    });
    if (!apiBlocklist) return null;

    const ips = opts.includeIps
      ? await BlocklistIpsTable.findAll({
          where: { [BlocklistIpsTable.col.blocklistId]: numId },
          order: [['id', DB_SORTING.ASC]],
          raw: true,
        })
      : null;

    return { type: 'api' as const, data: apiBlocklist.toJSON(), ips };
  }

  /** Paginated IP rows of one blocklist (api or cs); null when the parent does not exist. */
  async getIpsPage(id: string, opts: { limit: number; offset: number; unpaged: boolean; onlyStrings: boolean }) {
    const isCsId = id.startsWith('crowdsec-');
    let whereClause: Record<string, number | string>;

    if (isCsId) {
      const csBlocklist = await CsBlocklistsTable.findByPk(id);
      if (!csBlocklist) return null;
      whereClause = { [BlocklistIpsTable.col.csBlocklistId]: id };
    } else {
      const numId = Number(id);
      const apiBlocklist = await BlocklistsTable.findByPk(numId);
      if (!apiBlocklist) return null;
      whereClause = { [BlocklistIpsTable.col.blocklistId]: numId };
    }

    const queryOptions: FindAndCountOptions<BlocklistIp> = {
      where: whereClause,
      order: [['id', DB_SORTING.ASC]],
      attributes: opts.onlyStrings ? ['value'] : undefined,
    };

    if (!opts.unpaged) {
      queryOptions.limit = opts.limit;
      queryOptions.offset = opts.offset;
    }

    const { rows, count } = await BlocklistIpsTable.findAndCountAll({
      ...queryOptions,
      raw: true,
    });

    return { items: rows, total: count };
  }
}
