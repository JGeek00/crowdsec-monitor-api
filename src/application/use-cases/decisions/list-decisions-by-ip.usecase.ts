import type { DecisionGroup, DecisionWithAlert, GetDecisionsQueryParams } from './decisions.dto';
import type { DecisionRepository } from '@/application/ports/decision-repository.port';
import { applyJsFilters, groupDecisionsByIp, buildPaginatedResponse } from './list.helpers';
import { canonicalizeFields } from '@/shared/utils/timestamp-format';

// Called by: delivery/http controllers (decisions by-ip list endpoint)
export class ListDecisionsByIpUseCase {
  constructor(private readonly deps: { decisionRepository: DecisionRepository }) {}

  async execute(query: GetDecisionsQueryParams): Promise<Record<string, unknown>> {
    const { limit = 100, offset = 0, unpaged = false, only_active } = query;
    const withDecisions = String(query.include_decisions) === 'true';

    const [filtering, rows] = await Promise.all([
      this.deps.decisionRepository.fetchFilteringOptions(),
      this.deps.decisionRepository.findByQuery(query, { withAlert: withDecisions, group: true }),
    ]);

    const jsFiltered = applyJsFilters(rows, query.country, query.ip_owner);

    let groups = groupDecisionsByIp(jsFiltered, only_active, withDecisions);
    if (only_active) groups = groups.filter((g) => g.active_decisions > 0);

    let paginatedGroups: DecisionGroup[] = groups;
    if (withDecisions) {
      // Canonicalize embedded decisions before pagination (same as legacy).
      paginatedGroups = groups.map((group) => ({
        ...group,
        decisions: (group.decisions ?? []).map((decision: DecisionWithAlert) =>
          canonicalizeFields(decision, ['expiration', 'crowdsec_created_at'], {
            kind: 'decision',
            id: decision.id,
          }),
        ),
      }));
    }

    const { items, pagination, total } = buildPaginatedResponse(
      paginatedGroups,
      Number(limit),
      Number(offset),
      unpaged ?? false,
    );

    return { filtering, groups: items, pagination, total };
  }
}
