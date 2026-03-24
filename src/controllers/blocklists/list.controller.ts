import { Request, Response } from 'express';
import { literal } from 'sequelize';
import { Blocklist, BlocklistIp, CsBlocklist } from '../../models';
import { createRequestSignal } from '../../utils/request-signal';
import { errorResponse } from '../../utils/error-response';

const COUNT_API_IPS_ATTRIBUTE: [ReturnType<typeof literal>, string] = [
  literal('(SELECT COUNT(*) FROM blocklist_ips WHERE blocklist_ips.blocklist_id = "Blocklist"."id")'),
  'count_ips',
];

const COUNT_CS_IPS_ATTRIBUTE: [ReturnType<typeof literal>, string] = [
  literal('(SELECT COUNT(*) FROM blocklist_ips WHERE blocklist_ips.cs_blocklist_id = "CsBlocklist"."id")'),
  'count_ips',
];

const IPS_INCLUDE_OPTION = {
  model: BlocklistIp,
  as: 'blocklistIps',
  attributes: { exclude: ['created_at', 'updated_at'] },
};

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

    const includeOption = includeIps ? [IPS_INCLUDE_OPTION] : [];

    const [totalApi, totalCs] = await Promise.all([
      onlyCs ? Promise.resolve(0) : Blocklist.count(),
      onlyApi ? Promise.resolve(0) : CsBlocklist.count(),
    ]);
    const total = totalApi + totalCs;

    let apiRows: any[] = [];
    let csRows: any[] = [];

    if (unpaged === 'true') {
      [apiRows, csRows] = await Promise.all([
        onlyCs ? Promise.resolve([]) : Blocklist.findAll({
          attributes: { include: [COUNT_API_IPS_ATTRIBUTE] },
          order: [['name', 'ASC']],
          include: includeOption,
        }),
        onlyApi ? Promise.resolve([]) : CsBlocklist.findAll({
          attributes: { include: [COUNT_CS_IPS_ATTRIBUTE] },
          order: [['name', 'ASC']],
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
              attributes: { include: [COUNT_API_IPS_ATTRIBUTE] },
              order: [['name', 'ASC']],
              include: includeOption,
              limit: apiLimit,
              offset: apiOffset,
            }).then((rows) => { apiRows = rows; })
          : Promise.resolve(),
        csLimit > 0
          ? CsBlocklist.findAll({
              attributes: { include: [COUNT_CS_IPS_ATTRIBUTE] },
              order: [['name', 'ASC']],
              include: includeOption,
              limit: csLimit,
              offset: csOffset,
            }).then((rows) => { csRows = rows; })
          : Promise.resolve(),
      ]);
    }

    const mapItem = (item: any, type: 'api' | 'cs') => {
      const obj = item.toJSON();
      obj.type = type;
      if (onlyIps && Array.isArray(obj.blocklistIps)) {
        obj.blocklistIps = obj.blocklistIps.map((ip: any) => ip.value);
      }
      return obj;
    };

    const items = [
      ...apiRows.map((row) => mapItem(row, 'api')),
      ...csRows.map((row) => mapItem(row, 'cs')),
    ];

    const response: any = { items };

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

    const numId = Number(id);

    // Try api-managed first
    const apiBlocklist = await Blocklist.findByPk(numId, {
      attributes: { include: [COUNT_API_IPS_ATTRIBUTE] },
    });

    if (apiBlocklist) {
      const ips = includeIps
        ? await BlocklistIp.findAll({
            where: { blocklist_id: numId },
            order: [['id', 'ASC']],
            attributes: { exclude: ['created_at', 'updated_at'] },
            raw: true,
          })
        : null;

      const result: any = apiBlocklist.toJSON();
      result.type = 'api';
      if (ips !== null) {
        result.blocklistIps = onlyIps ? ips.map((ip: any) => ip.value) : ips;
      }
      res.status(200).json({ data: result });
      return;
    }

    // Fall back to cs-managed
    const csBlocklist = await CsBlocklist.findByPk(numId, {
      attributes: { include: [COUNT_CS_IPS_ATTRIBUTE] },
    });

    if (!csBlocklist) {
      res.status(404).json(errorResponse('Not found', 'Blocklist not found'));
      return;
    }

    const ips = includeIps
      ? await BlocklistIp.findAll({
          where: { cs_blocklist_id: numId },
          order: [['id', 'ASC']],
          attributes: { exclude: ['created_at', 'updated_at'] },
          raw: true,
        })
      : null;

    const result: any = csBlocklist.toJSON();
    result.type = 'cs';
    if (ips !== null) {
      result.blocklistIps = onlyIps ? ips.map((ip: any) => ip.value) : ips;
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
