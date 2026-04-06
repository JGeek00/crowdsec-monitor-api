import { Request, Response } from 'express';
import { BlocklistType } from "@/interfaces/blocklist.interface";
import { CsBlocklist, BlocklistIp, Blocklist } from "@/models";
import { BlocklistAttributes } from "@/models/Blocklist";
import { BlocklistIpAttributes } from "@/models/BlocklistIp";
import { CsBlocklistAttributes } from "@/models/CsBlocklist";
import { errorResponse } from "@/utils/error-response";
import { createRequestSignal } from "@/utils/request-signal";
import { BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE, BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE } from '@/helpers/blocklists.helper';

/**
 * Get a specific blocklist by ID.
 * Looks up api-managed blocklists first, then cs-managed blocklists.
 * Query params:
 *   - include_ips=full       → include blocklistIps as full objects
 *   - include_ips=ip_string  → include blocklistIps as plain IP strings
 */
export async function getBlocklistById(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { id } = req.params;
    const includeIps = req.query.include_ips === 'full' || req.query.include_ips === 'ip_string';
    const onlyIps = req.query.include_ips === 'ip_string';

    const isCsId = (id as string).startsWith('crowdsec-');

    if (isCsId) {
      const csBlocklist = await CsBlocklist.findByPk(id as string, {
        attributes: { include: [BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE] },
      });

      if (!csBlocklist) {
        res.status(404).json(errorResponse('Not found', 'Blocklist not found'));
        return;
      }

      const ips = includeIps
        ? await BlocklistIp.findAll({
            where: { cs_blocklist_id: id as string },
            order: [['id', 'ASC']],
            attributes: { exclude: ['created_at', 'updated_at'] },
            raw: true,
          })
        : null;

      const result = csBlocklist.toJSON() as unknown as (CsBlocklistAttributes & { type: BlocklistType; blocklistIps?: BlocklistIpAttributes[] | string[] });
      result.type = 'cs';
      if (ips !== null) {
        result.blocklistIps = onlyIps ? (ips as BlocklistIpAttributes[]).map((ip) => ip.value) : ips;
      }
      res.status(200).json({ data: result });
      return;
    }

    const numId = Number(id);
    const apiBlocklist = await Blocklist.findByPk(numId, {
      attributes: { include: [BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE] },
    });

    if (!apiBlocklist) {
      res.status(404).json(errorResponse('Not found', 'Blocklist not found'));
      return;
    }

    const ips = includeIps
      ? await BlocklistIp.findAll({
          where: { blocklist_id: numId },
          order: [['id', 'ASC']],
          attributes: { exclude: ['created_at', 'updated_at'] },
          raw: true,
        })
      : null;

    const result = apiBlocklist.toJSON() as unknown as (BlocklistAttributes & { type: BlocklistType; blocklistIps?: BlocklistIpAttributes[] | string[] });
    result.id = String(result.id) as unknown as number;
    result.type = 'api';
    if (ips !== null) {
      result.blocklistIps = onlyIps ? (ips as BlocklistIpAttributes[]).map((ip) => ip.value) : ips;
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
