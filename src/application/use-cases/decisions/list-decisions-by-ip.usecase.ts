import type { Decision, DecisionGroup, GetDecisionsQueryParams } from '@/models';
import type { DecisionRepository } from '@/application/ports/decision-repository.port';
import {
  applyJsFilters,
  fetchFilteringOptions,
  buildDecisionsWhere,
  groupDecisionsByIp,
  buildPaginatedResponse,
} from './list.helpers';
import { canonicalizeFields } from '@/utils/timestamp-format';

// Called by: delivery/http controllers (decisions by-ip list endpoint)
export class ListDecisionsByIpUseCase {
  constructor(private readonly deps: { decisionRepository: DecisionRepository }) {}

  async execute(query: GetDecisionsQueryParams): Promise<unknown> {
    const { limit = 100, offset = 0, unpaged = false, only_active } = query;
    const withDecisions = String((query as { include_decisions?: unknown }).include_decisions) === 'true';

    const where = buildDecisionsWhere(query, true);

    const [filtering, rows] = await Promise.all([
      fetchFilteringOptions(),
      this.deps.decisionRepository.findWithQuery(where, { withAlert: withDecisions }),
    ]);

    const plainRows = rows as Decision[];

    const jsFiltered = applyJsFilters(plainRows, query.country, query.ip_owner);

    let groups = groupDecisionsByIp(jsFiltered, only_active as boolean | undefined, withDecisions);
    if (only_active) groups = groups.filter((g) => g.active_decisions > 0);

    let paginatedGroups: DecisionGroup[] = groups;
    if (withDecisions) {
      // Canonicalize embedded decisions before pagination (same as legacy).
      paginatedGroups = groups.map((group) => ({
        ...group,
        decisions: ((group.decisions ?? []) as (Decision & { alert?: unknown })[]).map((decision) =>
          canonicalizeFields(decision, ['expiration', 'crowdsec_created_at'], {
            kind: 'decision',
            id: (decision as Decision).id,
          }),
        ),
      })) as unknown as DecisionGroup[];
    }

    const { items, pagination, total } = buildPaginatedResponse(
      paginatedGroups,
      +(limit as number),
      +(offset as number),
      unpaged!,
    );

    return { filtering, groups: items, pagination, total };
  }
}
