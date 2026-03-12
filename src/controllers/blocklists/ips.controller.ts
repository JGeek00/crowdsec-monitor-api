import { Request, Response } from 'express';
import { BlocklistIp } from '../../models';
import { Blocklist, CsBlocklist } from '../../models';
import { createRequestSignal } from '../../utils/request-signal';

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
    const numId = Number(blocklistId);

    // Determine which table this ID belongs to
    const apiBlocklist = await Blocklist.findByPk(numId);
    let whereClause: Record<string, number>;

    if (apiBlocklist) {
      whereClause = { blocklist_id: numId };
    } else {
      const csBlocklist = await CsBlocklist.findByPk(numId);
      if (!csBlocklist) {
        res.status(404).json({ error: 'Blocklist not found' });
        return;
      }
      whereClause = { cs_blocklist_id: numId };
    }

    const queryOptions: any = {
      where: whereClause,
      order: [['id', 'ASC']],
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

    const items = onlyStrings ? ips.map((ip: any) => ip.value) : ips;
    const response: any = { items };

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
    res.status(500).json({
      error: 'Failed to fetch blocklist IPs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    cleanup();
  }
}
