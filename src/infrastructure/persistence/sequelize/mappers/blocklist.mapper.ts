import type { Blocklist, BlocklistIp } from '@/models';

/**
 * Table ↔ Entity mapper for the blocklist aggregate (blocklist + its IP rows).
 * Timestamps are already Date objects on Sequelize instances; no JSON columns
 * exist on these tables, so mapping is a plain structural copy that keeps the
 * canonical timestamp handling centralized for future raw-query use.
 */
export const BlocklistMapper = {
  toEntity(row: Blocklist): Blocklist {
    return {
      id: row.id,
      url: row.url,
      name: row.name,
      enabled: row.enabled,
      added_date: row.added_date,
      last_refresh_attempt: row.last_refresh_attempt,
      last_successful_refresh: row.last_successful_refresh,
      last_refresh_failed: row.last_refresh_failed,
    };
  },

  ipToEntity(row: BlocklistIp): BlocklistIp {
    return {
      id: row.id,
      blocklist_id: row.blocklist_id,
      cs_blocklist_id: row.cs_blocklist_id,
      blocklist_name: row.blocklist_name,
      value: row.value,
      origin: row.origin,
    };
  },
};
