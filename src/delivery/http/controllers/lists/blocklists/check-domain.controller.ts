import { Request, Response } from 'express';
import { log } from '@/infrastructure/system/logger';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/container';

/**
 * Resolve DNS for a domain using the configured DNS server and check if any
 * resolved IP is in any blocklist.
 */
export async function checkDomainBlocklist(req: Request, res: Response): Promise<void> {
  try {
    const { domain } = req.body as { domain: string };

    const result = await container.useCases.blocklists.checkDomain.execute(domain);

    if ('unresolvable' in result) {
      res.status(422).json(errorResponse('Unprocessable entity', 'Could not resolve domain to any IP address'));
      return;
    }

    res.status(200).json(result);
  } catch (err) {
    log.error('Error checking domain blocklist:', err);
    res
      .status(500)
      .json(errorResponse('Failed to check domain blocklist', err instanceof Error ? err.message : 'Unknown error'));
  }
}
