import { NotFoundError } from '@/domain/errors';
import type { BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import { canonicalizeFields } from '@/utils/timestamp-format';
import type { BlocklistIp } from '@/domain/entities';

// Called by: delivery/http controllers (blocklists detail endpoint)
export class GetBlocklistUseCase {
  constructor(private readonly deps: { blocklistRepository: BlocklistRepository }) {}

  async execute(id: string, includeIps: boolean, onlyIps: boolean): Promise<unknown> {
    const result = await this.deps.blocklistRepository.findByIdMerged(id, { includeIps });
    if (!result) {
      throw new NotFoundError('Blocklist not found');
    }

    const canonical = canonicalizeFields(
      result.data as object,
      ['added_date', 'last_refresh_attempt', 'last_successful_refresh'] as never,
    ) as Record<string, unknown>;

    if (result.type === 'api') {
      canonical.id = String(canonical.id);
    }
    canonical.type = result.type;
    if (result.ips !== null) {
      canonical.blocklistIps = onlyIps ? (result.ips as BlocklistIp[]).map((ip) => ip.value) : result.ips;
    }
    return canonical;
  }
}
