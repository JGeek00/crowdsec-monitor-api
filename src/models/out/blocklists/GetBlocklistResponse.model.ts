import { Blocklist, CsBlocklist } from '@/models';

export interface GetBlocklistResponse {
  data: Blocklist | CsBlocklist;
}
