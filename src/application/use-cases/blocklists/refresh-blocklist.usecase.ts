import { NotFoundError, ServiceUnavailableError } from '@/domain/errors';
import type { BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import { log } from '@/infrastructure/system/logger';
import { statusBlocklistService } from '@/infrastructure/status/memory-process-tracker';
import { blocklistOpsService } from '@/infrastructure/sync/blocklist-ops';

// Called by: delivery/http controllers (blocklists refresh endpoint, lists/refresh endpoint)
export class RefreshSingleBlocklistUseCase {
  constructor(private readonly deps: { blocklistRepository: BlocklistRepository }) {}

  async execute(id: number): Promise<void> {
    const { blocklistRepository } = this.deps;

    if (statusBlocklistService.isSyncingBlocklists()) {
      throw new ServiceUnavailableError('Blocklist refresh is in progress. Please try again later.');
    }

    const blocklist = await blocklistRepository.findById(id);
    if (!blocklist) {
      throw new NotFoundError('Blocklist not found');
    }

    if (statusBlocklistService.isBlocklistBusy(blocklist.id)) {
      throw new ConflictError(
        'A process is already running for this blocklist. Wait for it to complete before performing another action.',
      );
    }

    void blocklistOpsService.refreshBlocklists(blocklist as never).catch((err: unknown) => {
      log.error(`Error refreshing blocklist "${blocklist.name}": ${err instanceof Error ? err.message : err}`);
    });
  }
}

import { ConflictError } from '@/domain/errors';

// Called by: delivery/http controllers (lists/refresh endpoint)
export class RefreshAllBlocklistsUseCase {
  constructor(private readonly deps: { blocklistRepository: BlocklistRepository }) {}

  async execute(): Promise<void> {
    if (statusBlocklistService.isAnyBlocklistProcessRunning()) {
      throw new ServiceUnavailableError('A blocklist operation is already in progress. Please try again later.');
    }

    void blocklistOpsService.refreshBlocklists().catch((err: unknown) => {
      log.error('Background blocklist refresh failed:', err);
    });
  }
}
