import { assertSafeBlocklistUrl } from '@/domain/value-objects/blocklist-url.vo';
import { ConflictError, ServiceUnavailableError, UpstreamUnavailableError, ValidationError } from '@/domain/errors';
import type { BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import type { Blocklist } from '@/domain/entities/blocklist.entity';
import type { Logger } from '@/application/ports/logger.port';
import type { LapiClient } from '@/application/ports/lapi-client.port';
import type { ProcessTrackerPort } from '@/application/ports/process-tracker.port';
import type { BlocklistOpsPort } from '@/application/ports/blocklist-ops.port';
import { PROCESS_FIELD_BLOCKLIST } from '@/types/process.types';

export interface CreateBlocklistInput {
  url: string;
  name: string;
}

// Called by: delivery/http controllers (blocklists create endpoint)
export class CreateBlocklistUseCase {
  constructor(
    private readonly deps: {
      blocklistRepository: BlocklistRepository;
      bouncer: Pick<LapiClient, 'checkBouncerConnection' | 'isBouncerConnected'>;
      tracker: ProcessTrackerPort;
      ops: BlocklistOpsPort;
      logger: Logger;
    },
  ) {}

  async execute(input: CreateBlocklistInput): Promise<Blocklist> {
    const { blocklistRepository, bouncer, tracker, ops, logger } = this.deps;

    if (tracker.isSyncingBlocklists()) {
      throw new ServiceUnavailableError('Blocklist refresh is in progress. Please try again later.');
    }

    await bouncer.checkBouncerConnection();
    if (!bouncer.isBouncerConnected()) {
      logger.warn(
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
    const processId = tracker.createBlocklistImportProcess(blocklist.id, blocklist.name);
    void ops
      .activateBlocklist(blocklist, undefined, processId, PROCESS_FIELD_BLOCKLIST.IMPORT)
      .then(() => tracker.completeProcess(processId, true))
      .catch((err: unknown) => {
        tracker.completeProcess(processId, false, err instanceof Error ? err.message : null);
        logger.error(
          `Error during initial activation of blocklist "${blocklist.name}": ${err instanceof Error ? err.message : err}`,
        );
      });

    return blocklist;
  }
}
