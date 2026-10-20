import { NotFoundError } from '@/domain/errors';
import type { BlocklistListItem, BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import { canonicalizeFields } from '@/shared/utils/timestamp-format';
import type { BlocklistIp } from '@/domain/entities';

// Called by: delivery/http controllers (blocklists detail endpoint)
export class GetBlocklistUseCase {
  constructor(private readonly deps: { blocklistRepository: BlocklistRepository }) {}

  async execute(id: string, includeIps: boolean, onlyIps: boolean): Promise<BlocklistListItem> {
    const result = await this.deps.blocklistRepository.findByIdMerged(id, { includeIps });
    if (!result) {
      throw new NotFoundError('Blocklist not found');
    }

    const canonical = canonicalizeFields(result.data, [
      'added_date',
      'last_refresh_attempt',
      'last_successful_refresh',
    ]) as BlocklistListItem;

    if (result.type === 'api') {
      canonical.id = String(canonical.id);
    }
    canonical.type = result.type;
    if (result.ips !== null) {
      canonical.blocklistIps = onlyIps ? result.ips.map((ip: BlocklistIp) => ip.value) : result.ips;
    }
    return canonical;
  }
}
