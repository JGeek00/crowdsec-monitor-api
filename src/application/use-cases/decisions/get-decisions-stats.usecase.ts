import type { DecisionRepository } from '@/application/ports/decision-repository.port';
import type { DecisionStats } from '@/application/ports/decision-repository.port';

// Called by: delivery/http controllers (decisions stats endpoint)
export class GetDecisionsStatsUseCase {
  constructor(private readonly deps: { decisionRepository: DecisionRepository }) {}

  execute(): Promise<DecisionStats> {
    return this.deps.decisionRepository.getStats();
  }
}
