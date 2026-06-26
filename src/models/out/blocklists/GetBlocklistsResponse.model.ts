import { BlocklistIp, BlocklistType, Pagination } from '@/models';

export interface GetBlocklistsResponse {
  items: GetBlocklistsResponse_Item[];
  pagination?: Pagination;
  total?: number;
}

export interface GetBlocklistsResponse_Item {
  id: string;
  name: string;
  type: BlocklistType;
  enabled?: boolean;
  url?: string;
  added_date?: Date;
  last_refresh_attempt?: Date | null;
  last_successful_refresh?: Date | null;
  last_refresh_failed?: boolean | null;
  count_ips?: number | string;
  blocklistIps?: BlocklistIp[] | string[];
}
