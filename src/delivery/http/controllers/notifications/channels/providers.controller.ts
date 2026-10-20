import { Request, Response } from 'express';
import { GetProvidersResponse, ResponseWithError } from '@/delivery/http/contracts';
import { notificationProviders, notificationProvidersVersion } from '@/constants/notification-providers';
import { sanitizeProviderDefinitions } from '@/shared/utils/notification-channel';
import { errorResponse } from '@/delivery/http/error-response';
import { log } from '@/infrastructure/system/logger';

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
