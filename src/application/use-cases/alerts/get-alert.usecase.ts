import type { Alert, Decision } from '@/domain/entities';
import { parseAlertMeta } from '@/utils/parse-meta-values';
import { NotFoundError } from '@/domain/errors';
import type { AlertRepository } from '@/application/ports/alert-repository.port';

export interface GetAlertResult {
  alert: ReturnType<typeof parseAlertMeta>;
  decisions: Decision[];
}

// Called by: delivery/http controllers (alerts detail endpoint)
export class GetAlertUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  async execute(id: number): Promise<GetAlertResult> {
    const alert = await this.deps.alertRepository.findById(id);
    if (!alert) {
      throw new NotFoundError('Alert not found');
    }
    const decisions = await this.deps.alertRepository.findDecisionsByAlertId(id);
    const withMeta = alert as Alert<import('@/shared/meta-data').UnparsedMetaData> & { decisions?: Decision[] };
    return { alert: parseAlertMeta(withMeta), decisions };
  }
}
