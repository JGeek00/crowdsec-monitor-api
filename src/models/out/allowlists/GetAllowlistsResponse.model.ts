import { CrowdSecAllowlist } from "@/types/crowdsec.types";

export interface GetAllowlistsResponse {
  data: CrowdSecAllowlist[];
  length: number;
}