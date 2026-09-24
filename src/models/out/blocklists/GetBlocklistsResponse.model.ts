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
  added_date?: string | null;
  last_refresh_attempt?: string | null;
  last_successful_refresh?: string | null;
  last_refresh_failed?: boolean | null;
  count_ips?: number | string;
  blocklistIps?: BlocklistIp[] | string[];
}
