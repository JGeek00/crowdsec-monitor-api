import { Request, Response } from 'express';
import { createRequestSignal } from '@/delivery/http/request-signal';
import { errorResponse } from '@/delivery/http/error-response';
import { container } from '@/container';
import { PaginationError } from '@/application/use-cases/decisions/list.helpers';
import type {
  GetDecisionsByIpQueryParams,
  GetDecisionsByIpResponse,
  ResponseWithError,
} from '@/delivery/http/contracts';

/**
 * Get decisions grouped by IP, with filtering and pagination.
 * Default: returns groups with counts only.
 * ?include_decisions=true: returns groups with full decision objects including alert detail.
 */
type Res = ResponseWithError<GetDecisionsByIpResponse>;
export async function listDecisionsByIp(
  req: Request<object, Res, object, GetDecisionsByIpQueryParams>,
  res: Response<Res>,
): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    // Transport adapts to the input DTO: query params may arrive as raw strings.
    const rawIncludeDecisions = req.query.include_decisions as boolean | string | undefined;
    const result = await container.useCases.decisions.listDecisionsByIp.execute({
      ...req.query,
      include_decisions: String(rawIncludeDecisions) === 'true',
    });
    res.json(result);
  } catch (error) {
    if (signal.aborted) return;
    if (error instanceof PaginationError) {
      res.status(400).json(errorResponse('Validation error', error.message));
      return;
    }
    res
      .status(500)
      .json(errorResponse('Error fetching decisions by IP', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
