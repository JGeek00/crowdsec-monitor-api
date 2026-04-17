import { Request, Response } from 'express';
import { BlocklistIp } from '@/models';
import { Blocklist, CsBlocklist } from '@/models';
import { FindAndCountOptions } from 'sequelize';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { BlocklistIpAttributes } from '@/models/BlocklistIp';
import { BlocklistIpsResponse } from '@/interfaces/blocklist.interface';
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
export async function getBlocklistIps(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { blocklistId } = req.params;
    const { limit = 50, offset = 0, unpaged, ip_string } = req.query;
    const onlyStrings = ip_string === 'true';
    const isCsId = (blocklistId as string).startsWith('crowdsec-');
    let whereClause: Record<string, number | string>;

    if (isCsId) {
      const csBlocklist = await CsBlocklist.findByPk(blocklistId as string);
      if (!csBlocklist) {
        res.status(404).json(errorResponse('Not found', 'Blocklist not found'));
        return;
      }
      whereClause = { [BlocklistIp.col.csBlocklistId]: blocklistId as string };
    } else {
      const numId = Number(blocklistId);
      const apiBlocklist = await Blocklist.findByPk(numId);
      if (!apiBlocklist) {
        res.status(404).json(errorResponse('Not found', 'Blocklist not found'));
        return;
      }
      whereClause = { [BlocklistIp.col.blocklistId]: numId };
    }

    const queryOptions: FindAndCountOptions<BlocklistIpAttributes> = {
      where: whereClause,
      order: [['id', DB_SORTING.ASC]],
      attributes: onlyStrings ? ['value'] : { exclude: ['created_at', 'updated_at'] },
    };

    if (unpaged !== 'true') {
      queryOptions.limit = Number(limit);
      queryOptions.offset = Number(offset);
    }

    const { rows: ips, count: total } = await BlocklistIp.findAndCountAll({
      ...queryOptions,
      raw: true,
    });

    const items: BlocklistIpAttributes[] | string[] = onlyStrings
      ? (ips as BlocklistIpAttributes[]).map((ip) => ip.value)
      : (ips as BlocklistIpAttributes[]);
    const response: BlocklistIpsResponse = { items };

    if (unpaged !== 'true') {
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
