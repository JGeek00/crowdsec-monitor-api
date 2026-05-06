import type { BlocklistIpAttributes } from '@/models/db/BlocklistIp';
import type { PaginationInfo } from './pagination.interface';

export interface BlocklistItem {
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
  blocklistIps?: BlocklistIpAttributes[] | string[];
}

export const BLOCKLIST_TYPE = {
  API: 'api',
  CROWDSEC: 'cs',
} as const;
export type BlocklistType = typeof BLOCKLIST_TYPE[keyof typeof BLOCKLIST_TYPE];

export interface BlocklistListResponse {
  items: BlocklistItem[];
  pagination?: PaginationInfo;
  total?: number;
}

export interface BlocklistIpsResponse {
  items: BlocklistIpAttributes[] | string[];
  pagination?: PaginationInfo;
  total?: number;
}
