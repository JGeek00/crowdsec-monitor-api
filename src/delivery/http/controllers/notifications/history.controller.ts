import { Request, Response } from 'express';
import type { GetNotificationHistoryResponse, ResponseWithError } from '@/delivery/http/contracts';
import { errorResponse } from '@/delivery/http/error-response';
import { log } from '@/infrastructure/system/logger';
import { container } from '@/container';

type Res = ResponseWithError<GetNotificationHistoryResponse>;

export async function getNotificationHistory(_req: Request, res: Response<Res>): Promise<void> {
  try {
    const result = container.useCases.notifications.getNotificationHistory.execute();
    res.status(200).json(result as never);
  } catch (err) {
    log.error('Error getting notification history:', err);
    res.status(500).json(errorResponse('Failed to get history', err instanceof Error ? err.message : 'Unknown error'));
  }
}
