import { BlocklistIp, Pagination, ResponseWithError } from "@/models";

interface GetBlocklistIpsResponseBody {
  items: BlocklistIp[] | string[];
  pagination?: Pagination;
  total?: number;
}

export type GetBlocklistIpsResponse = ResponseWithError<GetBlocklistIpsResponseBody>;
