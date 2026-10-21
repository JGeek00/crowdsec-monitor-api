import { NotFoundError } from '@/domain/errors';
import type { BlocklistIpsResult, BlocklistRepository } from '@/application/ports/blocklist-repository.port';

// Called by: delivery/http controllers (blocklists ips endpoint)
export class GetBlocklistIpsUseCase {
  constructor(private readonly deps: { blocklistRepository: BlocklistRepository }) {}

  async execute(
    id: string,
    opts: { limit: number; offset: number; unpaged: boolean; onlyStrings: boolean },
  ): Promise<BlocklistIpsResult> {
    const result = await this.deps.blocklistRepository.getIpsPage(id, opts);
    if (!result) {
      throw new NotFoundError('BlocklistsTable not found');
    }

    const items = opts.onlyStrings ? result.items.map((ip) => ip.value) : result.items;

    if (opts.unpaged) {
      return { total: result.total, items };
    }
    const page = Math.floor(opts.offset / opts.limit) + 1;
    return { items, pagination: { page, amount: items.length, total: result.total } };
  }
}
