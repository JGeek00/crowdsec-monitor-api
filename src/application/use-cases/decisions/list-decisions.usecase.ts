import { canonicalizeFields } from '@/shared/utils/timestamp-format';
import type { GetDecisionsQueryParams } from './decisions.dto';
import type { DecisionRepository } from '@/application/ports/decision-repository.port';
import { buildPaginatedResponse } from './list.helpers';

// Called by: delivery/http controllers (decisions list endpoint)
export class ListDecisionsUseCase {
  constructor(private readonly deps: { decisionRepository: DecisionRepository }) {}

  async execute(query: GetDecisionsQueryParams): Promise<Record<string, unknown>> {
    const { limit = 100, offset = 0, unpaged = false } = query;
    const [filtering, decisions] = await Promise.all([
      this.deps.decisionRepository.fetchFilteringOptions(),
      this.deps.decisionRepository.findByQuery(query),
    ]);

    const { items, pagination, total } = buildPaginatedResponse(
      decisions,
      Number(limit),
      Number(offset),
      unpaged ?? false,
    );

    const delivery = items.map((item) =>
      canonicalizeFields(item, ['expiration', 'crowdsec_created_at'], { kind: 'decision', id: item.id }),
    );

    return { filtering, items: delivery, pagination, total };
  }
}
