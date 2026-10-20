import {
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  UpstreamUnavailableError,
  ValidationError,
} from '@/domain/errors';
import type { BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import type { Blocklist } from '@/domain/entities/blocklist.entity';
import { log } from '@/services/log.service';
import { crowdSecAPI } from '@/services/crowdsec-api.service';
import { statusBlocklistService } from '@/services/blocklists/status-blocklist.service';
import { blocklistOpsService } from '@/services/blocklists/blocklist-ops.service';
import { PROCESS_FIELD_BLOCKLIST, PROCESS_FIELD_BLOCKLIST_OPS } from '@/types/process.types';

// Called by: delivery/http controllers (blocklists toggle endpoint)
export class ToggleBlocklistUseCase {
  constructor(private readonly deps: { blocklistRepository: BlocklistRepository }) {}

  async execute(id: number, enabled: boolean): Promise<Blocklist> {
    const { blocklistRepository } = this.deps;

    if (statusBlocklistService.isSyncingBlocklists()) {
      throw new ServiceUnavailableError('Blocklist refresh is in progress. Please try again later.');
    }

    if (typeof enabled !== 'boolean') {
      throw new ValidationError('"enabled" must be a boolean');
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

    if (enabled) {
      await crowdSecAPI.checkBouncerConnection();
      if (!crowdSecAPI.isBouncerConnected()) {
        log.warn(
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
    let crowdsecOp: Promise<unknown>;

    if (enabled) {
      processId = statusBlocklistService.createBlocklistEnableProcess(blocklist.id, blocklist.name);
      crowdsecOp = blocklistOpsService.activateBlocklist(
        updated as never,
        undefined,
        processId,
        PROCESS_FIELD_BLOCKLIST.ENABLE,
      );
    } else {
      const totalIps = (await blocklistRepository.getIps(blocklist.id)).length;
      processId = statusBlocklistService.createBlocklistDisableProcess(totalIps, blocklist.id, blocklist.name);
      crowdsecOp = blocklistOpsService.deleteBlocklistAlerts(
        updated as never,
        processId,
        PROCESS_FIELD_BLOCKLIST_OPS.DISABLE,
      );
    }

    void crowdsecOp
      .then(() => statusBlocklistService.completeProcess(processId, true))
      .catch((err: unknown) => {
        statusBlocklistService.completeProcess(processId, false, err instanceof Error ? err.message : null);
        log.error(
          `Background CrowdSec sync failed for blocklist "${blocklist.name}": ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    return updated;
  }
}
