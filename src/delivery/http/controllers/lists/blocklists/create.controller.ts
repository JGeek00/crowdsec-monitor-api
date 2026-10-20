import { Request, Response } from 'express';
import { container } from '@/container';
import { log } from '@/infrastructure/system/logger';
import type { PostBlocklistBody, PostBlocklistResponse, ResponseWithError } from '@/models';
import { sendBlocklistError } from './send-blocklist-error';

/**
 * Add a new blocklist URL.
 * Body: { url: string, name: string }
 */
type Res = ResponseWithError<PostBlocklistResponse>;
export async function createBlocklist(req: Request<object, Res, PostBlocklistBody>, res: Response<Res>): Promise<void> {
  try {
    const blocklist = await container.useCases.blocklists.createBlocklist.execute(req.body);
    res.status(201).json({ data: blocklist });
  } catch (err) {
    sendBlocklistError(res, err, 'Failed to create blocklist', 'Unknown error', log, 'Error creating blocklist:');
  }
}
