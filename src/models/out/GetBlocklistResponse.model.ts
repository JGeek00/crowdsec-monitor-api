import { Blocklist, CsBlocklist, ResponseWithError } from "@/models";

interface GetBlocklistResponseBody {
  data: Blocklist | CsBlocklist;
}

export type GetBlocklistResponse = ResponseWithError<GetBlocklistResponseBody>;