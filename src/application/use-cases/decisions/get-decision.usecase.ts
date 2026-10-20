import type { Decision, Alert } from '@/domain/entities';
import type { UnparsedMetaData } from '@/shared/meta-data';
import { parseAlertMeta } from '@/utils/parse-meta-values';
import { canonicalizeFields } from '@/utils/timestamp-format';
import { NotFoundError } from '@/domain/errors';
import type { DecisionRepository } from '@/application/ports/decision-repository.port';

// Called by: delivery/http controllers (decisions detail endpoint)
export class GetDecisionUseCase {
  constructor(private readonly deps: { decisionRepository: DecisionRepository }) {}

  async execute(id: number): Promise<unknown> {
    const decision = await this.deps.decisionRepository.findById(id, { withAlert: true });
    if (!decision) {
      throw new NotFoundError('DecisionsTable not found');
    }

    const rawDecision = decision as Decision & { alert?: unknown };
    return {
      ...canonicalizeFields(rawDecision, ['expiration', 'crowdsec_created_at'], {
        kind: 'decision',
        id: rawDecision.id,
      }),
      alert: rawDecision.alert ? parseAlertMeta(rawDecision.alert as Alert<UnparsedMetaData>) : undefined,
    };
  }
}
