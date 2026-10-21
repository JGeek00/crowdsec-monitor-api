import { NotFoundError, ConflictError, ServiceUnavailableError } from '@/domain/errors';
import type { BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import type { Logger } from '@/application/ports/logger.port';
import type { ProcessTrackerPort } from '@/application/ports/process-tracker.port';
import type { BlocklistOpsPort } from '@/application/ports/blocklist-ops.port';
import { PROCESS_FIELD_BLOCKLIST_OPS } from '@/shared/process.types';

// Called by: delivery/http controllers (blocklists delete endpoint)
export class DeleteBlocklistUseCase {
  constructor(
    private readonly deps: {
      blocklistRepository: BlocklistRepository;
      tracker: ProcessTrackerPort;
      ops: BlocklistOpsPort;
      logger: Logger;
    },
  ) {}

  async execute(id: number): Promise<void> {
    const { blocklistRepository, tracker, ops, logger } = this.deps;

    if (tracker.isSyncingBlocklists()) {
      throw new ServiceUnavailableError('Blocklist refresh is in progress. Please try again later.');
    }

    const blocklist = await blocklistRepository.findById(id);
    if (!blocklist) {
      throw new NotFoundError('BlocklistsTable not found');
    }

    if (tracker.isBlocklistBusy(blocklist.id)) {
      throw new ConflictError(
        'A process is already running for this blocklist. Wait for it to complete before performing another action.',
      );
    }

    const totalIps = (await blocklistRepository.getIps(blocklist.id)).length;
    const processId = tracker.createBlocklistDeleteProcess(totalIps, blocklist.id, blocklist.name);

    await blocklistRepository.deleteById(blocklist.id);

    void ops
      .deleteBlocklistAlerts(blocklist, processId, PROCESS_FIELD_BLOCKLIST_OPS.DELETE)
      .then(() => tracker.completeProcess(processId, true))
      .catch((err: unknown) => {
        tracker.completeProcess(processId, false, err instanceof Error ? err.message : null);
        logger.error(`Error deleting blocklist alerts "${blocklist.name}":`, err);
      });
  }
}
