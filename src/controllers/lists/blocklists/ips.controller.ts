import { Request, Response } from 'express';
import { FindAndCountOptions } from 'sequelize';
import { BlocklistIp, BlocklistIpsTable, BlocklistsTable, CsBlocklistsTable, GetBlocklistIpsParams, GetBlocklistIpsQueryParams, GetBlocklistIpsResponse, ResponseWithError } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { DB_SORTING } from '@/interfaces/database.interface';

/**
 * Get IPs for a specific blocklist with pagination.
 * Works for both api-managed (blocklist_id) and cs-managed (cs_blocklist_id) blocklists.
 * Query params:
 *   - ip_string=true → return plain IP strings instead of full objects
 *   - limit          → results per page (default 50)
 *   - offset         → pagination offset (default 0)
 *   - unpaged        → return all results without pagination
 */

export async function getBlocklistIps(req: Request<GetBlocklistIpsParams, GetBlocklistIpsResponse, {}, GetBlocklistIpsQueryParams>, res: Response<GetBlocklistIpsResponse>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, unpaged, ip_string } = req.query;
    const onlyStrings = ip_string === 'true';
    const isCsId = id.startsWith('crowdsec-');
    let whereClause: Record<string, number | string>;

    if (isCsId) {
      const csBlocklist = await CsBlocklistsTable.findByPk(id);
      if (!csBlocklist) {
        res.status(404).json(errorResponse('Not found', 'BlocklistsTable not found'));
        return;
      }
      whereClause = { [BlocklistIpsTable.col.csBlocklistId]: id };
    } else {
      const numId = Number(id);
      const apiBlocklist = await BlocklistsTable.findByPk(numId);
      if (!apiBlocklist) {
        res.status(404).json(errorResponse('Not found', 'BlocklistsTable not found'));
        return;
      }
      whereClause = { [BlocklistIpsTable.col.blocklistId]: numId };
    }

    const queryOptions: FindAndCountOptions<BlocklistIp> = {
      where: whereClause,
      order: [['id', DB_SORTING.ASC]],
      attributes: onlyStrings ? ['value'] : { exclude: ['created_at', 'updated_at'] },
    };

    if (unpaged !== true) {
      queryOptions.limit = Number(limit);
      queryOptions.offset = Number(offset);
    }

    const { rows: ips, count: total } = await BlocklistIpsTable.findAndCountAll({
      ...queryOptions,
      raw: true,
    });

    const items: BlocklistIp[] | string[] = onlyStrings
      ? (ips as BlocklistIp[]).map((ip) => ip.value)
      : (ips as BlocklistIp[]);
    const response: GetBlocklistIpsResponse = { items };

    if (unpaged !== true) {
      const page = Math.floor(Number(offset) / Number(limit)) + 1;
      response.pagination = {
        page,
        amount: items.length,
        total,
      };
    } else {
      response.total = total;
    }

    res.status(200).json(response);
  } catch (error) {
    if (signal.aborted) return;
    console.error('Error fetching blocklist IPs:', error);
    res.status(500).json(errorResponse('Failed to fetch blocklist IPs', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
