import { NotFoundError, ServiceUnavailableError, ConflictError } from '@/domain/errors';
import type { BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import type { Logger } from '@/application/ports/logger.port';
import type { ProcessTrackerPort } from '@/application/ports/process-tracker.port';
import type { BlocklistOpsPort } from '@/application/ports/blocklist-ops.port';

// Called by: delivery/http controllers (blocklists refresh endpoint, lists/refresh endpoint)
export class RefreshSingleBlocklistUseCase {
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
      throw new NotFoundError('Blocklist not found');
    }

    if (tracker.isBlocklistBusy(blocklist.id)) {
      throw new ConflictError(
        'A process is already running for this blocklist. Wait for it to complete before performing another action.',
      );
    }

    void ops.refreshBlocklists(blocklist).catch((err: unknown) => {
      logger.error(`Error refreshing blocklist "${blocklist.name}": ${err instanceof Error ? err.message : err}`);
    });
  }
}

// Called by: delivery/http controllers (lists/refresh endpoint)
export class RefreshAllBlocklistsUseCase {
  constructor(
    private readonly deps: {
      tracker: ProcessTrackerPort;
      ops: BlocklistOpsPort;
      logger: Logger;
    },
  ) {}

  async execute(): Promise<void> {
    const { tracker, ops, logger } = this.deps;

    if (tracker.isAnyBlocklistProcessRunning()) {
      throw new ServiceUnavailableError('A blocklist operation is already in progress. Please try again later.');
    }

    void ops.refreshBlocklists().catch((err: unknown) => {
      logger.error('Background blocklist refresh failed:', err);
    });
  }
}
