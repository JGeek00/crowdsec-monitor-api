import { Request, Response } from 'express';
import { Blocklist } from '../../models';
import { databaseService } from '../../services';
import { errorResponse } from '../../utils/error-response';
import { assertSafeUrl } from '../../utils/url';

/**
 * Add a new blocklist URL.
 * Body: { url: string, name: string }
 */
export async function createBlocklist(req: Request, res: Response): Promise<void> {
  try {
    const { url, name } = req.body;

    if (!url || typeof url !== 'string' || url.trim() === '') {
      res.status(400).json(errorResponse('Validation error', 'url is required'));
      return;
    }
    try {
      assertSafeUrl(url.trim());
    } catch (err) {
      res.status(400).json(errorResponse('Validation error', err instanceof Error ? err.message : 'Invalid URL'));
      return;
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json(errorResponse('Validation error', 'name is required'));
      return;
    }

    const existing = await Blocklist.findOne({ where: { url: url.trim() } });
    if (existing) {
      res.status(409).json(errorResponse('Conflict', 'A blocklist with this URL already exists'));
      return;
    }

    const blocklist = await Blocklist.create({
      url: url.trim(),
      name: name.trim(),
      enabled: true,
      added_date: new Date(),
      last_refresh_attempt: null,
      last_successful_refresh: null,
    });

    res.status(201).json({ data: blocklist });

    // Trigger immediate fetch & CrowdSec push in the background
    databaseService.refreshBlocklist(blocklist).catch((err) =>
      console.error(`Error during initial refresh of blocklist "${blocklist.name}": ${err instanceof Error ? err.message : err}`)
    );
  } catch (error) {
    console.error('Error creating blocklist:', error);
    res.status(500).json(errorResponse('Failed to create blocklist', error instanceof Error ? error.message : 'Unknown error'));
  }
}
