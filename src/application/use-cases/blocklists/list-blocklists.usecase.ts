import type {
  BlocklistListItem,
  BlocklistListResult,
  BlocklistMergedRow,
  BlocklistRepository,
} from '@/application/ports/blocklist-repository.port';
import { canonicalizeFields } from '@/shared/utils/timestamp-format';
import type { GetBlocklistsQueryParams } from './blocklists.dto';
import { BLOCKLIST_TYPE, type BlocklistType } from '@/domain/entities/blocklist.entity';

// Called by: delivery/http controllers (blocklists merged list endpoint)
export class ListBlocklistsUseCase {
  constructor(private readonly deps: { blocklistRepository: BlocklistRepository }) {}

  async execute(query: GetBlocklistsQueryParams): Promise<BlocklistListResult> {
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

    const mapItem = (item: BlocklistMergedRow, type: BlocklistType): BlocklistListItem => {
      const canonical = canonicalizeFields(item, ['added_date', 'last_refresh_attempt', 'last_successful_refresh']);
      const mapped: BlocklistListItem = {
        ...canonical,
        id: String(item.id),
        type,
        ...(onlyIps && item.blocklistIps ? { blocklistIps: item.blocklistIps.map((ip) => ip.value) } : {}),
      };
      return mapped;
    };

    const items = [
      ...apiRows.map((row) => mapItem(row, BLOCKLIST_TYPE.API)),
      ...csRows.map((row) => mapItem(row, BLOCKLIST_TYPE.CROWDSEC)),
    ];

    if (unpaged === true) {
      return { total, items };
    }
    const page = Math.floor(off / lim) + 1;
    return { items, pagination: { page, amount: items.length, total } };
  }
}
