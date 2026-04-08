import { Request, Response } from 'express';
import { literal } from 'sequelize';
import { Blocklist, BlocklistIp, CsBlocklist } from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { BlocklistIpAttributes } from '@/models/BlocklistIp';
import { BLOCKLIST_TYPE, BlocklistItem, BlocklistListResponse, BlocklistType } from '@/interfaces/blocklist.interface';
import { BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE, BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE, BLOCKLISTS_IPS_INCLUDE_OPTION } from '@/helpers/blocklists.helper';
import { DB_SORTING } from '@/interfaces/database.interface';

/**
 * Get all blocklists (api-managed first, then cs-managed).
 * Query params:
 *   - include_ips=full       → include blocklistIps as full objects
 *   - include_ips=ip_string  → include blocklistIps as plain IP strings
 *   - unpaged=true          → return all results without pagination
 *   - limit / offset        → pagination (default limit 100, offset 0)
 *   - get_only=blocklists   → return only api-managed blocklists
 *   - get_only=cs_blocklists → return only cs-managed blocklists
 */
export async function getBlocklists(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { limit = 100, offset = 0, unpaged, include_ips, get_only } = req.query;
    const lim = Number(limit);
    const off = Number(offset);
    const includeIps = include_ips === 'full' || include_ips === 'ip_string';
    const onlyIps = include_ips === 'ip_string';
    const onlyApi = get_only === 'blocklists';
    const onlyCs = get_only === 'cs_blocklists';

    const includeOption = includeIps ? [BLOCKLISTS_IPS_INCLUDE_OPTION] : [];

    const [totalApi, totalCs] = await Promise.all([
      onlyCs ? Promise.resolve(0) : Blocklist.count(),
      onlyApi ? Promise.resolve(0) : CsBlocklist.count(),
    ]);
    const total = totalApi + totalCs;

    let apiRows: Blocklist[] = [];
    let csRows: CsBlocklist[] = [];

    if (unpaged === 'true') {
      [apiRows, csRows] = await Promise.all([
        onlyCs ? Promise.resolve([]) : Blocklist.findAll({
          attributes: { include: [BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE] },
          order: [[Blocklist.col.name, DB_SORTING.ASC]],
          include: includeOption,
        }),
        onlyApi ? Promise.resolve([]) : CsBlocklist.findAll({
          attributes: { include: [BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE] },
          order: [[CsBlocklist.col.name, DB_SORTING.ASC]],
          include: includeOption,
        }),
      ]);
    } else {
      // api-managed first, cs-managed second
      const apiOffset = off;
      const apiLimit = onlyCs ? 0 : Math.max(0, Math.min(lim, totalApi - apiOffset));
      const csOffset = Math.max(0, off - totalApi);
      const csLimit = onlyApi ? 0 : lim - apiLimit;

      await Promise.all([
        apiLimit > 0
          ? Blocklist.findAll({
              attributes: { include: [BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE] },
              order: [[Blocklist.col.name, DB_SORTING.ASC]],
              include: includeOption,
              limit: apiLimit,
              offset: apiOffset,
            }).then((rows) => { apiRows = rows; })
          : Promise.resolve(),
        csLimit > 0
          ? CsBlocklist.findAll({
              attributes: { include: [BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE] },
              order: [[CsBlocklist.col.name, DB_SORTING.ASC]],
              include: includeOption,
              limit: csLimit,
              offset: csOffset,
            }).then((rows) => { csRows = rows; })
          : Promise.resolve(),
      ]);
    }

    const mapItem = (item: Blocklist | CsBlocklist, type: BlocklistType): BlocklistItem => {
      const obj = item.toJSON() as BlocklistItem;
      obj.id = String(obj.id);
      obj.type = type;
      if (onlyIps && Array.isArray(obj.blocklistIps)) {
        obj.blocklistIps = (obj.blocklistIps as BlocklistIpAttributes[]).map((ip) => ip.value);
      }
      return obj;
    };

    const items = [
      ...apiRows.map((row) => mapItem(row, BLOCKLIST_TYPE.API)),
      ...csRows.map((row) => mapItem(row, BLOCKLIST_TYPE.CROWDSEC)),
    ];

    const response: BlocklistListResponse = { items };

    if (unpaged !== 'true') {
      const page = Math.floor(off / lim) + 1;
      response.pagination = { page, amount: items.length, total };
    } else {
      response.total = total;
    }

    res.status(200).json(response);
  } catch (error) {
    if (signal.aborted) return;
    console.error('Error fetching blocklists:', error);
    res.status(500).json(errorResponse('Failed to fetch blocklists', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}

