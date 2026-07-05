import { BLOCKLIST_IP_ORIGIN, BlocklistIpsTable, BlocklistsTable } from '@/models';
import { sequelize } from '@/config/database';
import { defaults } from '@/config/env-defaults';
import appDefaults from '@/constants/app-defaults';
import { PROCESS_ERRORS } from '@/constants/process-errors';
import { log } from '@/services/log.service';
import { AsyncWriteLock } from '@/helpers/blocklists/blocklist-sync-lock';

const lock = new AsyncWriteLock();

/**
 * Database operations for blocklist IP management.
 * All writes are serialized through an async lock to prevent race conditions.
 */
class BlocklistDbService {
  /**
   * Write IPs to the local DB: destroy existing rows, then bulk-create in chunks.
   */
  public async writeIpsToDb(blocklist: BlocklistsTable, ips: string[]): Promise<void> {
    const name = blocklist.name;
    const dbChunkSize = defaults.blocklists.writeChunkSize;
    const dbChunkCount = Math.ceil(ips.length / dbChunkSize);
    log.debug(`  Writing ${ips.length} IPs to DB for "${name}" in ${dbChunkCount} chunk(s)`);

    try {
      await lock.acquire(async () => {
        await sequelize.transaction(async (t) => {
          await BlocklistIpsTable.destroy({
            where: { [BlocklistIpsTable.col.blocklistId]: blocklist.id },
            transaction: t,
          });

          for (let i = 0; i < ips.length; i += dbChunkSize) {
            const chunk = ips.slice(i, i + dbChunkSize).map((value: string) => ({
              blocklist_id: blocklist.id,
              blocklist_name: blocklist.name,
              value,
              origin: BLOCKLIST_IP_ORIGIN.BLOCKLIST,
            }));
            await BlocklistIpsTable.bulkCreate(chunk, { transaction: t, ignoreDuplicates: true });
            log.debug(
              `    DB chunk ${Math.floor(i / dbChunkSize) + 1}/${dbChunkCount} written for "${name}" (${chunk.length} IPs)`,
            );
          }
        });
      });
    } catch {
      throw new Error(PROCESS_ERRORS.blocklistImport.dbWriteFailed);
    }
  }

  /**
   * Chunk-delete all IP rows for a blocklist from the local DB.
   */
  public async deleteBlocklistIps(blocklist: BlocklistsTable): Promise<number> {
    const name = blocklist.name;
    log.debug(`  Cleaning up local IPs for blocklist "${name}"...`);

    let totalDeleted = 0;

    try {
      await lock.acquire(async () => {
        while (true) {
          const chunk = await BlocklistIpsTable.findAll({
            attributes: ['id'],
            where: { [BlocklistIpsTable.col.blocklistId]: blocklist.id },
            limit: appDefaults.blocklists.blocklistIpsDeleteChunkSize,
          });
          if (chunk.length === 0) break;
          await BlocklistIpsTable.destroy({ where: { [BlocklistIpsTable.col.id]: chunk.map((ip) => ip.id) } });
          totalDeleted += chunk.length;
          log.debug(`    Deleted ${chunk.length} IP rows for "${name}" (total: ${totalDeleted})`);
          if (chunk.length < appDefaults.blocklists.blocklistIpsDeleteChunkSize) break;
        }
      });
      log.debug(`  Local DB cleanup complete for "${name}": ${totalDeleted} rows deleted`);
    } catch {
      throw new Error(PROCESS_ERRORS.blocklistDisable.dbCleanupFailed);
    }

    return totalDeleted;
  }

  /**
   * Update the refresh metadata on a blocklist row (acquires write lock).
   */
  public async updateRefreshMetadata(
    blocklist: BlocklistsTable,
    payload: {
      last_refresh_attempt: Date;
      last_successful_refresh?: Date;
      last_refresh_failed: boolean;
    },
  ): Promise<void> {
    await lock.acquire(() => blocklist.update(payload));
  }
}

export const blocklistDbService = new BlocklistDbService();
