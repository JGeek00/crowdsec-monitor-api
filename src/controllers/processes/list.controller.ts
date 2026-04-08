import { Request, Response } from 'express';
import { processTrackingService } from '@/services';

/**
 * GET /api/v1/processes
 * Returns all active processes plus completed ones within the last hour.
 */
export async function getProcesses(req: Request, res: Response): Promise<void> {
  res.json({ data: processTrackingService.getVisibleProcesses() });
}
