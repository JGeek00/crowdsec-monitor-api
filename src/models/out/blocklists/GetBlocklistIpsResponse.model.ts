import { BlocklistIp, Pagination } from "@/models";

export interface GetBlocklistIpsResponse {
  items: BlocklistIp[] | string[];
  pagination?: Pagination;
  total?: number;
}
