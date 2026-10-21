import { CrowdSecAllowlist } from '@/shared/crowdsec.types';

export interface GetAllowlistsResponse {
  data: CrowdSecAllowlist[];
  length: number;
}
