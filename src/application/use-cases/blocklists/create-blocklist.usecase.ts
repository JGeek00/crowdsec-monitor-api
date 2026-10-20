import { assertSafeBlocklistUrl } from '@/domain/value-objects/blocklist-url.vo';
import { ConflictError, ServiceUnavailableError, UpstreamUnavailableError, ValidationError } from '@/domain/errors';
import type { BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import type { Blocklist } from '@/domain/entities/blocklist.entity';
import { log } from '@/infrastructure/system/logger';
import { crowdSecAPI } from '@/infrastructure/crowdsec/lapi/crowdsec-api';
import { statusBlocklistService } from '@/infrastructure/status/memory-process-tracker';
import { blocklistOpsService } from '@/infrastructure/sync/blocklist-ops';
import { PROCESS_FIELD_BLOCKLIST } from '@/types/process.types';

export interface CreateBlocklistInput {
  url: string;
  name: string;
}

// Called by: delivery/http controllers (blocklists create endpoint)
export class CreateBlocklistUseCase {
  constructor(private readonly deps: { blocklistRepository: BlocklistRepository }) {}

  async execute(input: CreateBlocklistInput): Promise<Blocklist> {
    const { blocklistRepository } = this.deps;

    if (statusBlocklistService.isSyncingBlocklists()) {
      throw new ServiceUnavailableError('Blocklist refresh is in progress. Please try again later.');
    }

    await crowdSecAPI.checkBouncerConnection();
    if (!crowdSecAPI.isBouncerConnected()) {
      log.warn(
        '[Blocklist] Cannot create blocklist: CrowdSec bouncer API key is not valid or CrowdSec LAPI is unreachable. Check the CROWDSEC_BOUNCER_KEY configuration and restart the API.',
      );
      throw new UpstreamUnavailableError(
        'Unable to reach CrowdSec LAPI with the configured bouncer key. Blocklist operations are unavailable.',
      );
    }

    const { url, name } = input;

    if (!url || typeof url !== 'string' || url.trim() === '') {
      throw new ValidationError('url is required');
    }
    try {
      assertSafeBlocklistUrl(url.trim());
    } catch (err) {
      throw new ValidationError(err instanceof Error ? err.message : 'Invalid URL');
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new ValidationError('name is required');
    }

    const existing = await blocklistRepository.findByUrl(url.trim());
    if (existing) {
      throw new ConflictError('A blocklist with this URL already exists');
    }

    const blocklist = await blocklistRepository.create(url.trim(), name.trim());

    // Trigger immediate fetch & CrowdSec push in the background
    const processId = statusBlocklistService.createBlocklistImportProcess(blocklist.id, blocklist.name);
    void blocklistOpsService
      .activateBlocklist(blocklist as never, undefined, processId, PROCESS_FIELD_BLOCKLIST.IMPORT)
      .then(() => statusBlocklistService.completeProcess(processId, true))
      .catch((err: unknown) => {
        statusBlocklistService.completeProcess(processId, false, err instanceof Error ? err.message : null);
        log.error(
          `Error during initial activation of blocklist "${blocklist.name}": ${err instanceof Error ? err.message : err}`,
        );
      });

    return blocklist;
  }
}
