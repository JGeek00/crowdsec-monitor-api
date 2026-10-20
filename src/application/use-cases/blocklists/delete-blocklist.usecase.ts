import { NotFoundError, ConflictError, ServiceUnavailableError } from '@/domain/errors';
import type { BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import { log } from '@/services/log.service';
import { statusBlocklistService } from '@/services/blocklists/status-blocklist.service';
import { blocklistOpsService } from '@/services/blocklists/blocklist-ops.service';
import { PROCESS_FIELD_BLOCKLIST_OPS } from '@/types/process.types';

// Called by: delivery/http controllers (blocklists delete endpoint)
export class DeleteBlocklistUseCase {
  constructor(private readonly deps: { blocklistRepository: BlocklistRepository }) {}

  async execute(id: number): Promise<void> {
    const { blocklistRepository } = this.deps;

    if (statusBlocklistService.isSyncingBlocklists()) {
      throw new ServiceUnavailableError('Blocklist refresh is in progress. Please try again later.');
    }

    const blocklist = await blocklistRepository.findById(id);
    if (!blocklist) {
      throw new NotFoundError('BlocklistsTable not found');
    }

    if (statusBlocklistService.isBlocklistBusy(blocklist.id)) {
      throw new ConflictError(
        'A process is already running for this blocklist. Wait for it to complete before performing another action.',
      );
    }

    const totalIps = (await blocklistRepository.getIps(blocklist.id)).length;
    const processId = statusBlocklistService.createBlocklistDeleteProcess(totalIps, blocklist.id, blocklist.name);

    await blocklistRepository.deleteById(blocklist.id);

    void blocklistOpsService
      .deleteBlocklistAlerts(blocklist as never, processId, PROCESS_FIELD_BLOCKLIST_OPS.DELETE)
      .then(() => statusBlocklistService.completeProcess(processId, true))
      .catch((err: unknown) => {
        statusBlocklistService.completeProcess(processId, false, err instanceof Error ? err.message : null);
        log.error(`Error deleting blocklist alerts "${blocklist.name}":`, err);
      });
  }
}
