import { NotFoundError } from '@/domain/errors';
import type { AlertRepository } from '@/application/ports/alert-repository.port';
import type { LapiClient } from '@/application/ports/lapi-client.port';
import type { SyncAlertsUseCase } from './sync-alerts.usecase';

// Called by: delivery/http controllers (alerts delete endpoint)
export class DeleteAlertUseCase {
  constructor(
    private readonly deps: {
      alertRepository: AlertRepository;
      lapiClient: LapiClient;
      syncAlerts: SyncAlertsUseCase;
    },
  ) {}

  /** Deletes from LAPI, then locally, then re-syncs. Preserves legacy semantics. */
  async execute(id: number): Promise<{ nbDeleted: number }> {
    const nbDeleted = await this.deps.lapiClient.deleteAlert(id);

    if (nbDeleted === 0) {
      throw new NotFoundError(`Alert with ID ${id} was not found`);
    }

    await this.deps.alertRepository.deleteById(id);
    await this.deps.syncAlerts.execute();

    return { nbDeleted };
  }
}
