import { Request, Response } from 'express';
import { createRequestSignal } from '@/utils/request-signal';
import { errorResponse } from '@/utils/error-response';
import { container } from '@/container';
import { NotFoundError } from '@/domain/errors';
import type { GetDecisionByIpParams, GetDecisionByIpResponse, ResponseWithError } from '@/models';

type Res = ResponseWithError<GetDecisionByIpResponse>;
export async function getDecisionByIp(req: Request<GetDecisionByIpParams, Res>, res: Response<Res>): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const ip = Array.isArray(req.params.ip) ? req.params.ip[0] : req.params.ip;
    const onlyActive = String(req.query.only_active) === 'true';

    const result = await container.useCases.decisions.getDecisionByIp.execute(ip, onlyActive);
    res.json(result as GetDecisionByIpResponse);
  } catch (error) {
    if (signal.aborted) return;
    if (error instanceof NotFoundError) {
      res.status(404).json(errorResponse('Not found', `No decisions for IP ${req.params.ip}`));
      return;
    }
    res
      .status(500)
      .json(errorResponse('Error fetching decision by IP', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
