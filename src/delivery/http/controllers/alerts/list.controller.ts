import { Request, Response } from 'express';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/container';
import { ValidationError } from '@/domain/errors';
import type { GetAlertsResponse, ResponseWithError, GetAlertsQueryParams } from '@/models';

/**
 * Get all alerts with filtering and pagination
 */
type Res = ResponseWithError<GetAlertsResponse>;
export async function getAllAlerts(
  req: Request<object, object, Res, GetAlertsQueryParams>,
  res: Response<Res>,
): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { limit = 100, offset = 0, unpaged = false } = req.query;

    const page = await container.useCases.alerts.listAlerts.execute(req.query);

    // Validate offset is not greater than total (only when paginated)
    if (!unpaged && (offset as number) > page.total) {
      res
        .status(400)
        .json(
          errorResponse(
            'Validation error',
            `Invalid parameter: offset (${offset}) cannot be greater than total items (${page.total})`,
          ),
        );
      return;
    }

    const response: GetAlertsResponse = {
      filtering: page.filtering,
      items: page.items,
    };

    // Include pagination info only when paginated
    if (!unpaged) {
      response.pagination = {
        page: Math.floor((offset as number) / (limit as number)) + 1,
        amount: page.items.length,
        total: page.total,
      };
    } else {
      response.total = page.total;
    }

    res.json(response);
  } catch (error) {
    if (signal.aborted) return;
    if (error instanceof ValidationError) {
      res.status(400).json(errorResponse('Validation error', error.detail));
      return;
    }
    res
      .status(500)
      .json(errorResponse('Error fetching alerts', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
