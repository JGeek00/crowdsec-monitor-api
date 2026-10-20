import { Request, Response } from 'express';
import { GetProvidersResponse, ResponseWithError } from '@/models';
import { notificationProviders, notificationProvidersVersion } from '@/constants/notification-providers';
import { sanitizeProviderDefinitions } from '@/utils/notification-channel';
import { errorResponse } from '@/utils/error-response';
import { log } from '@/services/log.service';

type Res = ResponseWithError<GetProvidersResponse>;

/** Serve the provider definitions so apps render channel forms generically. */
export async function listProviders(_req: Request, res: Response<Res>): Promise<void> {
  try {
    res.status(200).json({
      version: notificationProvidersVersion,
      providers: sanitizeProviderDefinitions(notificationProviders),
    });
  } catch (err) {
    log.error('Error listing notification providers:', err);
    res
      .status(500)
      .json(errorResponse('Failed to list providers', err instanceof Error ? err.message : 'Unknown error'));
  }
}
