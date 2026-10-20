import { Request, Response } from 'express';
import type { GetStatisticsQueryParams, GetStatisticsResponse, ResponseWithError } from '@/delivery/http/contracts';
import { createRequestSignal } from '@/delivery/http/request-signal';
import { errorResponse } from '@/delivery/http/error-response';
import { container } from '@/container';

/**
 * Get comprehensive statistics
 */
type Res = ResponseWithError<GetStatisticsResponse>;
export async function getStatistics(
  req: Request<object, Res, object, GetStatisticsQueryParams>,
  res: Response<Res>,
): Promise<void> {
  const { signal, cleanup } = createRequestSignal(req);
  try {
    const { since, amount } = req.query;
    const result = await container.useCases.statistics.getGeneralStatistics.execute(
      since,
      amount ? Number(amount) : undefined,
    );
    // GeneralStatistics uses generic { item, amount } rows; delivery maps them to the response field names.
    const response: GetStatisticsResponse = {
      alertsLast24Hours: result.alertsLast24Hours,
      activeDecisions: result.activeDecisions,
      activityHistory: result.activityHistory,
      topCountries: result.topCountries.map((country) => ({ countryCode: country.item, amount: country.amount })),
      topScenarios: result.topScenarios,
      topIpOwners: result.topIpOwners.map((owner) => ({ ipOwner: owner.item, amount: owner.amount })),
      topTargets: result.topTargets.map((target) => ({ target: target.item, amount: target.amount })),
    };
    res.json(response);
  } catch (error) {
    if (signal.aborted) return;
    res
      .status(500)
      .json(errorResponse('Error fetching statistics', error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    cleanup();
  }
}
