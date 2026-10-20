import type { DecisionRepository } from '@/application/ports/decision-repository.port';

// Called by: delivery/http controllers (decisions stats endpoint)
export class GetDecisionsStatsUseCase {
  constructor(private readonly deps: { decisionRepository: DecisionRepository }) {}

  execute(): Promise<{ total: number; byType: unknown[]; byScope: unknown[] }> {
    return this.deps.decisionRepository.getStats();
  }
}
