import { canonicalizeFields } from '@/utils/timestamp-format';
import type { Decision } from '@/domain/entities';
import type { GetDecisionsQueryParams } from './decisions.dto';
import type { DecisionRepository } from '@/application/ports/decision-repository.port';
import { buildPaginatedResponse } from './list.helpers';

// Called by: delivery/http controllers (decisions list endpoint)
export class ListDecisionsUseCase {
  constructor(private readonly deps: { decisionRepository: DecisionRepository }) {}

  async execute(query: GetDecisionsQueryParams): Promise<unknown> {
    const { limit = 100, offset = 0, unpaged = false } = query;
    const [filtering, decisions] = await Promise.all([
      this.deps.decisionRepository.fetchFilteringOptions(),
      this.deps.decisionRepository.findByQuery(query),
    ]);

    const { items, pagination, total } = buildPaginatedResponse(
      decisions,
      +(limit as number),
      +(offset as number),
      unpaged!,
    );

    const delivery = items.map((item) => {
      const plain = item as Decision;
      return canonicalizeFields(plain, ['expiration', 'crowdsec_created_at'], { kind: 'decision', id: plain.id });
    });

    return { filtering, items: delivery, pagination, total };
  }
}
