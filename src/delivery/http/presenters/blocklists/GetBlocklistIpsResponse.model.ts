import type { BlocklistIp } from '@/domain/entities';
import type { Pagination } from '@/shared/models';

export interface GetBlocklistIpsResponse {
  items: BlocklistIp[] | string[];
  pagination?: Pagination;
  total?: number;
}
