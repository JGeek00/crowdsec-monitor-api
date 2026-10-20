import type { Decision, Alert } from '@/models';
import type { UnparsedMetaData } from '@/shared/meta-data';
import { parseAlertMeta } from '@/utils/parse-meta-values';
import { canonicalizeFields } from '@/utils/timestamp-format';
import { NotFoundError } from '@/domain/errors';
import type { DecisionRepository } from '@/application/ports/decision-repository.port';
import { groupDecisionsByIp } from './list.helpers';

// Called by: delivery/http controllers (decisions by-ip detail endpoint)
export class GetDecisionByIpUseCase {
  constructor(private readonly deps: { decisionRepository: DecisionRepository }) {}

  async execute(ip: string, onlyActive: boolean): Promise<unknown> {
    const rows = await this.deps.decisionRepository.findByIp(ip, { withAlert: true });
    const plainRows = rows as (Decision & { alert?: unknown })[];

    const groups = groupDecisionsByIp(plainRows, onlyActive || undefined, true);
    const group = groups[0];
    if (!group) {
      throw new NotFoundError(`No decisions for IP ${ip}`);
    }

    return {
      ...group,
      decisions: ((group.decisions ?? []) as (Decision & { alert?: unknown })[]).map((decision) => {
        const { source: _ds, alert: rawAlert, ...rest } = decision;
        const canonicalRest = canonicalizeFields(rest, ['expiration', 'crowdsec_created_at'], {
          kind: 'decision',
          id: (rest as Decision).id,
        });
        if (!rawAlert) return { ...canonicalRest, alert: undefined };
        const { source: _as, ...alertRest } = parseAlertMeta(rawAlert as Alert<UnparsedMetaData>);
        return { ...canonicalRest, alert: alertRest };
      }),
    };
  }
}
