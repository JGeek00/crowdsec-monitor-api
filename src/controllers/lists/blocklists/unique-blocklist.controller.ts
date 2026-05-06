import { Request, Response } from 'express';
import { Blocklist, BlocklistIp, BlocklistIpsTable, BlocklistsTable, BlocklistType, CsBlocklist, CsBlocklistsTable, GetBlocklistParams, GetBlocklistQueryParams, GetBlocklistResponse, ResponseWithError } from "@/models";
import { errorResponse } from "@/utils/error-response";
import { createRequestSignal } from "@/utils/request-signal";
import { BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE, BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE } from '@/helpers/blocklists.helper';
import { DB_SORTING } from '@/types/database.types';

/**
 * Get a specific blocklist by ID.
 * Looks up api-managed blocklists first, then cs-managed blocklists.
 * Query params:
 *   - include_ips=full       → include blocklistIps as full objects
 *   - include_ips=ip_string  → include blocklistIps as plain IP strings
 */
type Res = ResponseWithError<GetBlocklistResponse>
export async function getBlocklistById(req: Request<GetBlocklistParams, Res, {}, GetBlocklistQueryParams>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { id } = req.params;
    const includeIps = req.query.include_ips === 'full' || req.query.include_ips === 'ip_string';
    const onlyIps = req.query.include_ips === 'ip_string';

    const isCsId = id.startsWith('crowdsec-');

    if (isCsId) {
      const csBlocklist = await CsBlocklistsTable.findByPk(id as string, {
        attributes: { include: [BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE] },
      });

      if (!csBlocklist) {
        res.status(404).json(errorResponse('Not found', 'Blocklist not found'));
        return;
      }

      const ips = includeIps
        ? await BlocklistIpsTable.findAll({
            where: { [BlocklistIpsTable.col.csBlocklistId]: id as string },
            order: [['id', DB_SORTING.ASC]],
            attributes: { exclude: ['created_at', 'updated_at'] },
            raw: true,
          })
        : null;

      const result = csBlocklist.toJSON() as (CsBlocklist & { type: BlocklistType; blocklistIps?: BlocklistIp[] | string[] });
      result.type = 'cs';
      if (ips !== null) {
        result.blocklistIps = onlyIps ? (ips as BlocklistIp[]).map((ip) => ip.value) : ips;
      }
      res.status(200).json({ data: result });
      return;
    }

    const numId = Number(id);
    const apiBlocklist = await BlocklistsTable.findByPk(numId, {
      attributes: { include: [BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE] },
    });

    if (!apiBlocklist) {
      res.status(404).json(errorResponse('Not found', 'Blocklist not found'));
      return;
    }

    const ips = includeIps
      ? await BlocklistIpsTable.findAll({
          where: { [BlocklistIpsTable.col.blocklistId]: numId },
          order: [['id', DB_SORTING.ASC]],
          attributes: { exclude: ['created_at', 'updated_at'] },
          raw: true,
        })
      : null;

    const result = apiBlocklist.toJSON() as (Blocklist & { type: BlocklistType; blocklistIps?: BlocklistIp[] | string[] });
    result.id = String(result.id) as unknown as number;
    result.type = 'api';
    if (ips !== null) {
      result.blocklistIps = onlyIps ? (ips as BlocklistIp[]).map((ip) => ip.value) : ips;
    }
    res.status(200).json({ data: result });
  } catch (error) {
    if (signal.aborted) return;
    console.error('Error fetching blocklist:', error);
    res.status(500).json(errorResponse('Failed to fetch blocklist', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
