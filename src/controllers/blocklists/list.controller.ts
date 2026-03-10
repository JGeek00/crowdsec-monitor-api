import { Request, Response } from 'express';
import { literal } from 'sequelize';
import { Blocklist, BlocklistIp } from '../../models';
import { createRequestSignal } from '../../utils/request-signal';

const COUNT_IPS_ATTRIBUTE: [ReturnType<typeof literal>, string] = [
  literal('(SELECT COUNT(*) FROM blocklist_ips WHERE blocklist_ips.blocklist_id = "Blocklist"."id")'),
  'count_ips',
];

/**
 * Get all blocklists.
 * Query params:
 *   - include_ips=full       → include blocklistIps as full objects
 *   - include_ips=ip_string  → include blocklistIps as plain IP strings
 *   - unpaged=true          → return all results without pagination
 *   - limit / offset        → pagination (default limit 100, offset 0)
 */
export async function getBlocklists(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { limit = 100, offset = 0, unpaged, include_ips } = req.query;
    const includeIps = include_ips === 'full' || include_ips === 'ip_string';
    const onlyIps = include_ips === 'ip_string';

    const queryOptions: any = {
      attributes: {
        include: [COUNT_IPS_ATTRIBUTE],
        exclude: ['created_at', 'updated_at'],
      },
      order: [['name', 'ASC']],
    };

    if (includeIps) {
      queryOptions.include = [
        {
          model: BlocklistIp,
          as: 'blocklistIps',
          attributes: { exclude: ['created_at', 'updated_at'] },
        },
      ];
    }

    if (unpaged !== 'true') {
      queryOptions.limit = Number(limit);
      queryOptions.offset = Number(offset);
    }

    const { rows: blocklists, count: total } = await Blocklist.findAndCountAll(queryOptions);

    const data = onlyIps
      ? blocklists.map((bl) => {
          const obj: any = bl.toJSON();
          if (Array.isArray(obj.blocklistIps)) {
            obj.blocklistIps = obj.blocklistIps.map((ip: any) => ip.value);
          }
          return obj;
        })
      : blocklists;

    res.status(200).json({
      data,
      total,
      limit: unpaged === 'true' ? total : Number(limit),
      offset: unpaged === 'true' ? 0 : Number(offset),
    });
  } catch (error) {
    if (signal.aborted) return;
    console.error('Error fetching blocklists:', error);
    res.status(500).json({
      error: 'Failed to fetch blocklists',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    cleanup();
  }
}

/**
 * Get a specific blocklist by ID.
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

    const blocklistQuery = Blocklist.findByPk(Number(id), {
      attributes: { 
        include: [COUNT_IPS_ATTRIBUTE],
        exclude: ['created_at', 'updated_at'],
      },
    });
    const ipsQuery = includeIps
      ? BlocklistIp.findAll({ 
          where: { blocklist_id: Number(id) }, 
          order: [['id', 'ASC']], 
          attributes: { exclude: ['created_at', 'updated_at'] }, 
          raw: true 
        })
      : Promise.resolve(null);

    const [blocklist, ips] = await Promise.all([blocklistQuery, ipsQuery]);

    if (!blocklist) {
      res.status(404).json({ error: 'Blocklist not found' });
      return;
    }

    const result: any = blocklist.toJSON();
    if (ips !== null) {
      result.blocklistIps = onlyIps ? ips.map((ip: any) => ip.value) : ips;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    if (signal.aborted) return;
    console.error('Error fetching blocklist:', error);
    res.status(500).json({
      error: 'Failed to fetch blocklist',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    cleanup();
  }
}
