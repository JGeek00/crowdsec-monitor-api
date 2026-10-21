import {
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  UpstreamUnavailableError,
  ValidationError,
} from '@/domain/errors';
import type { BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import type { Blocklist } from '@/domain/entities/blocklist.entity';
import type { Logger } from '@/application/ports/logger.port';
import type { LapiClient } from '@/application/ports/lapi-client.port';
import type { ProcessTrackerPort } from '@/application/ports/process-tracker.port';
import type { BlocklistOpsPort } from '@/application/ports/blocklist-ops.port';
import { PROCESS_FIELD_BLOCKLIST, PROCESS_FIELD_BLOCKLIST_OPS } from '@/shared/process.types';

// Called by: delivery/http controllers (blocklists toggle endpoint)
export class ToggleBlocklistUseCase {
  constructor(
    private readonly deps: {
      blocklistRepository: BlocklistRepository;
      bouncer: Pick<LapiClient, 'checkBouncerConnection' | 'isBouncerConnected'>;
      tracker: ProcessTrackerPort;
      ops: BlocklistOpsPort;
      logger: Logger;
    },
  ) {}

  async execute(id: number, enabled: boolean): Promise<Blocklist> {
    const { blocklistRepository, bouncer, tracker, ops, logger } = this.deps;

    if (tracker.isSyncingBlocklists()) {
      throw new ServiceUnavailableError('Blocklist refresh is in progress. Please try again later.');
    }

    if (typeof enabled !== 'boolean') {
      throw new ValidationError('"enabled" must be a boolean');
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

    if (enabled) {
      await bouncer.checkBouncerConnection();
      if (!bouncer.isBouncerConnected()) {
        logger.warn(
          '[Blocklists] Cannot enable blocklist: CrowdSec bouncer API key is not valid or CrowdSec LAPI is unreachable. Check the CROWDSEC_BOUNCER_KEY configuration and restart the API.',
        );
        throw new UpstreamUnavailableError(
          'Unable to reach CrowdSec LAPI with the configured bouncer key. BlocklistsTable operations are unavailable.',
        );
      }
    }

    const updated = await blocklistRepository.setEnabled(blocklist.id, enabled);
    if (!updated) {
      throw new NotFoundError('BlocklistsTable not found');
    }

    // Background CrowdSec operation (same fire-and-forget as legacy)
    let processId: string;
    let crowdsecOp: Promise<{ allowlistSkipped: number } | void>;

    if (enabled) {
      processId = tracker.createBlocklistEnableProcess(blocklist.id, blocklist.name);
      crowdsecOp = ops.activateBlocklist(updated, undefined, processId, PROCESS_FIELD_BLOCKLIST.ENABLE);
    } else {
      const totalIps = (await blocklistRepository.getIps(blocklist.id)).length;
      processId = tracker.createBlocklistDisableProcess(totalIps, blocklist.id, blocklist.name);
      crowdsecOp = ops.deleteBlocklistAlerts(updated, processId, PROCESS_FIELD_BLOCKLIST_OPS.DISABLE);
    }

    void crowdsecOp
      .then(() => tracker.completeProcess(processId, true))
      .catch((err: unknown) => {
        tracker.completeProcess(processId, false, err instanceof Error ? err.message : null);
        logger.error(
          `Background CrowdSec sync failed for blocklist "${blocklist.name}": ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    return updated;
  }
}
