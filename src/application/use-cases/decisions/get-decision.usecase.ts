import type { Alert } from '@/domain/entities';
import type { UnparsedMetaData } from '@/shared/meta-data';
import { parseAlertMeta } from '@/shared/utils/parse-meta-values';
import { canonicalizeFields } from '@/shared/utils/timestamp-format';
import { NotFoundError } from '@/domain/errors';
import type { DecisionRepository } from '@/application/ports/decision-repository.port';
import type { DecisionsDetailResult, DecisionWithAlert } from './decisions.dto';

// Called by: delivery/http controllers (decisions detail endpoint)
export class GetDecisionUseCase {
  constructor(private readonly deps: { decisionRepository: DecisionRepository }) {}

  async execute(id: number): Promise<DecisionsDetailResult> {
    const decision: DecisionWithAlert | null = await this.deps.decisionRepository.findById(id, { withAlert: true });
    if (!decision) {
      throw new NotFoundError('DecisionsTable not found');
    }

    return {
      ...canonicalizeFields(decision, ['expiration', 'crowdsec_created_at'], {
        kind: 'decision',
        id: decision.id,
      }),
      alert: decision.alert ? parseAlertMeta(decision.alert as Alert<UnparsedMetaData>) : undefined,
    };
  }
}
