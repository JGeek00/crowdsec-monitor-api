import type { Alert } from '@/domain/entities';
import type { UnparsedMetaData } from '@/shared/meta-data';
import { parseAlertMeta } from '@/shared/utils/parse-meta-values';
import { canonicalizeFields } from '@/shared/utils/timestamp-format';
import { NotFoundError } from '@/domain/errors';
import type { DecisionRepository } from '@/application/ports/decision-repository.port';
import type { DecisionWithAlert } from './decisions.dto';
import { groupDecisionsByIp } from './list.helpers';

// Called by: delivery/http controllers (decisions by-ip detail endpoint)
export class GetDecisionByIpUseCase {
  constructor(private readonly deps: { decisionRepository: DecisionRepository }) {}

  async execute(ip: string, onlyActive: boolean): Promise<Record<string, unknown>> {
    const rows: DecisionWithAlert[] = await this.deps.decisionRepository.findByIp(ip, { withAlert: true });

    const groups = groupDecisionsByIp(rows, onlyActive || undefined, true);
    const group = groups[0];
    if (!group) {
      throw new NotFoundError(`No decisions for IP ${ip}`);
    }

    return {
      ...group,
      decisions: (group.decisions ?? []).map((decision: DecisionWithAlert) => {
        const { source: _ds, alert: rawAlert, ...rest } = decision;
        const canonicalRest = canonicalizeFields(rest, ['expiration', 'crowdsec_created_at'], {
          kind: 'decision',
          id: rest.id,
        });
        if (!rawAlert) return { ...canonicalRest, alert: undefined };
        const { source: _as, ...alertRest } = parseAlertMeta(rawAlert as Alert<UnparsedMetaData>);
        return { ...canonicalRest, alert: alertRest };
      }),
    };
  }
}
