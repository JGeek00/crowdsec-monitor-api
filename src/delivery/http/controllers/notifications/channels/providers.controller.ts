import { Request, Response } from 'express';
import type { GetProvidersResponse, ResponseWithError } from '@/delivery/http/contracts';
import { errorResponse } from '@/delivery/http/error-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';

type Res = ResponseWithError<GetProvidersResponse>;

/** Serve the provider definitions so apps render channel forms generically. */
export async function listProviders(_req: Request, res: Response<Res>): Promise<void> {
  try {
    res.status(200).json(container.useCases.notifications.listProviders.execute());
  } catch (err) {
    log.error('Error listing notification providers:', err);
    res
      .status(500)
      .json(errorResponse('Failed to list providers', err instanceof Error ? err.message : 'Unknown error'));
  }
}
