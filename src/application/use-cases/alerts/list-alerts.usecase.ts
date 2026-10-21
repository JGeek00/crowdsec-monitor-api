import type { AlertRepository } from '@/application/ports/alert-repository.port';

// Called by: delivery/http controllers (alerts list endpoint)
export class ListAlertsUseCase {
  constructor(private readonly deps: { alertRepository: AlertRepository }) {}

  execute(query: Parameters<AlertRepository['findWithFilters']>[0]) {
    return this.deps.alertRepository.findWithFilters(query);
  }
}
