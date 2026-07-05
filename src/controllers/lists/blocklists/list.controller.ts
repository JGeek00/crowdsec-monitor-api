import { Request, Response } from 'express';
import {
  BLOCKLIST_TYPE,
  BlocklistIp,
  BlocklistsTable,
  BlocklistType,
  CsBlocklistsTable,
  GetBlocklistIpsParams,
  GetBlocklistsQueryParams,
  GetBlocklistsResponse,
  GetBlocklistsResponse_Item,
  ResponseWithError,
} from '@/models';
import { createRequestSignal } from '@/utils/request-signal';
import { log } from '@/services/log.service';
import { errorResponse } from '@/utils/error-response';
import { DB_SORTING } from '@/types/database.types';
import {
  BLOCKLISTS_IPS_INCLUDE_OPTION,
  BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE,
  BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE,
} from '@/helpers/blocklists/blocklists-db-queries';

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
type Res = ResponseWithError<GetBlocklistsResponse>;
export async function getBlocklists(
  req: Request<GetBlocklistIpsParams, Res, object, GetBlocklistsQueryParams>,
  res: Response<Res>,
): Promise<void> {
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
      onlyCs ? Promise.resolve(0) : BlocklistsTable.count(),
      onlyApi ? Promise.resolve(0) : CsBlocklistsTable.count(),
    ]);
    const total = totalApi + totalCs;

    let apiRows: BlocklistsTable[] = [];
    let csRows: CsBlocklistsTable[] = [];

    if (unpaged === true) {
      [apiRows, csRows] = await Promise.all([
        onlyCs
          ? Promise.resolve([])
          : BlocklistsTable.findAll({
              attributes: { include: [BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE] },
              order: [[BlocklistsTable.col.name, DB_SORTING.ASC]],
              include: includeOption,
            }),
        onlyApi
          ? Promise.resolve([])
          : CsBlocklistsTable.findAll({
              attributes: { include: [BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE] },
              order: [[CsBlocklistsTable.col.name, DB_SORTING.ASC]],
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

    const mapItem = (item: BlocklistsTable | CsBlocklistsTable, type: BlocklistType): GetBlocklistsResponse_Item => {
      const obj = item.toJSON() as GetBlocklistsResponse_Item;
      obj.id = String(obj.id);
      obj.type = type;
      if (onlyIps && Array.isArray(obj.blocklistIps)) {
        obj.blocklistIps = (obj.blocklistIps as BlocklistIp[]).map((ip) => ip.value);
      }
      return obj;
    };

    const items = [
      ...apiRows.map((row) => mapItem(row, BLOCKLIST_TYPE.API)),
      ...csRows.map((row) => mapItem(row, BLOCKLIST_TYPE.CROWDSEC)),
    ];

    const response: GetBlocklistsResponse = { items };

    if (unpaged !== true) {
      const page = Math.floor(off / lim) + 1;
      response.pagination = { page, amount: items.length, total };
    } else {
      response.total = total;
    }

    res.status(200).json(response);
  } catch (err) {
    if (signal.aborted) return;
    log.error('Error fetching blocklists:', err);
    res
      .status(500)
      .json(errorResponse('Failed to fetch blocklists', err instanceof Error ? err.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
