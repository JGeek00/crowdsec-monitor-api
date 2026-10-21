import { NotFoundError } from '@/domain/errors';
import type { DecisionRepository } from '@/application/ports/decision-repository.port';
import type { LapiClient } from '@/application/ports/lapi-client.port';
import type { SyncAlertsUseCase } from '../alerts/sync-alerts.usecase';

// Called by: delivery/http controllers (decisions delete endpoint)
export class DeleteDecisionUseCase {
  constructor(
    private readonly deps: {
      decisionRepository: DecisionRepository;
      lapiClient: LapiClient;
      syncAlerts: SyncAlertsUseCase;
    },
  ) {}

  /** Deletes from LAPI, then marks the local decision expired (legacy semantics). */
  async execute(id: number): Promise<{ nbDeleted: number }> {
    const nbDeleted = await this.deps.lapiClient.deleteDecision(id);

    if (nbDeleted === 0) {
      throw new NotFoundError(`DecisionsTable with ID ${id} was not found`);
    }

    await this.deps.decisionRepository.expireById(id);
    await this.deps.syncAlerts.execute();

    return { nbDeleted };
  }
}
