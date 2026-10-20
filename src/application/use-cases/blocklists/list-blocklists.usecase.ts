import type { BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import { canonicalizeFields } from '@/utils/timestamp-format';
import type { BlocklistIp } from '@/domain/entities';
import type { GetBlocklistsQueryParams } from './blocklists.dto';
import { BLOCKLIST_TYPE, type BlocklistType } from '@/domain/entities/blocklist.entity';

// Called by: delivery/http controllers (blocklists merged list endpoint)
export class ListBlocklistsUseCase {
  constructor(private readonly deps: { blocklistRepository: BlocklistRepository }) {}

  async execute(query: GetBlocklistsQueryParams): Promise<unknown> {
    const { limit = 100, offset = 0, unpaged, include_ips, get_only } = query;
    const lim = Number(limit);
    const off = Number(offset);
    const includeIps = include_ips === 'full' || include_ips === 'ip_string';
    const onlyIps = include_ips === 'ip_string';
    const onlyApi = get_only === 'blocklists';
    const onlyCs = get_only === 'cs_blocklists';

    const { apiRows, csRows, total } = await this.deps.blocklistRepository.listMerged({
      unpaged: unpaged === true,
      limit: lim,
      offset: off,
      includeIps,
      onlyApi,
      onlyCs,
    });

    const mapItem = (item: { toJSON(): unknown }, type: BlocklistType): Record<string, unknown> => {
      const obj = item.toJSON() as Record<string, unknown> & { blocklistIps?: BlocklistIp[] };
      obj.id = String(obj.id);
      obj.type = type;
      const canonical = canonicalizeFields(obj, [
        'added_date',
        'last_refresh_attempt',
        'last_successful_refresh',
      ] as never) as Record<string, unknown>;
      if (onlyIps && Array.isArray(canonical.blocklistIps)) {
        canonical.blocklistIps = (canonical.blocklistIps as BlocklistIp[]).map((ip) => ip.value);
      }
      return canonical;
    };

    const items = [
      ...(apiRows as { toJSON(): unknown }[]).map((row) => mapItem(row, BLOCKLIST_TYPE.API)),
      ...(csRows as { toJSON(): unknown }[]).map((row) => mapItem(row, BLOCKLIST_TYPE.CROWDSEC)),
    ];

    if (unpaged === true) {
      return { total, items };
    }
    const page = Math.floor(off / lim) + 1;
    return { items, pagination: { page, amount: items.length, total } };
  }
}
