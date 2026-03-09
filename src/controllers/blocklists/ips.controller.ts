import { Request, Response } from 'express';
import { BlocklistIp } from '../../models';
import { Blocklist } from '../../models';
import { createRequestSignal } from '../../utils/request-signal';

/**
 * Get IPs for a specific blocklist with pagination.
 * Query params:
 *   - limit   → results per page (default 50)
 *   - offset  → pagination offset (default 0)
 *   - unpaged → return all results without pagination
 */
export async function getBlocklistIps(req: Request, res: Response): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { blocklistId } = req.params;
    const { limit = 50, offset = 0, unpaged } = req.query;

    // Verify the blocklist exists
    const blocklist = await Blocklist.findByPk(Number(blocklistId));
    if (!blocklist) {
      res.status(404).json({ error: 'Blocklist not found' });
      return;
    }

    const queryOptions: any = {
      where: { blocklist_id: Number(blocklistId) },
      order: [['id', 'ASC']],
    };

    if (unpaged !== 'true') {
      queryOptions.limit = Number(limit);
      queryOptions.offset = Number(offset);
    }

    const { rows: ips, count: total } = await BlocklistIp.findAndCountAll({
      ...queryOptions,
      raw: true,
    });

    res.status(200).json({
      data: ips,
      total,
      limit: unpaged === 'true' ? total : Number(limit),
      offset: unpaged === 'true' ? 0 : Number(offset),
    });
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
