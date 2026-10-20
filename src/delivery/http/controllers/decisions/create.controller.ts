import { Request, Response } from 'express';
import { container } from '@/container';
import { errorResponse } from '@/delivery/http/error-response';
import type { PostDecisionBody, PostDecisionResponse, ResponseWithError } from '@/delivery/http/contracts';

/**
 * Create a decision in CrowdSec LAPI
 * Simplified endpoint that creates an alert with a decision
 */
type Res = ResponseWithError<PostDecisionResponse>;
export async function createDecision(req: Request<object, Res, PostDecisionBody>, res: Response<Res>): Promise<void> {
  try {
    const { ip, duration, reason, type } = req.body;

    const result = await container.useCases.decisions.createDecision.execute({ ip, duration, reason, type });

    res.status(201).json(result);
  } catch (error) {
    res
      .status(500)
      .json(errorResponse('Error creating decision', error instanceof Error ? error.message : 'Unknown error'));
  }
}
