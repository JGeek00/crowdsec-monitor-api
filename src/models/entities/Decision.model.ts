import { Alert_SourceInfo } from "@/models";

export interface Decision {
  id: number;
  alert_id: number;
  origin: string;
  type: string;
  scope: string;
  value: string;
  expiration: Date;
  scenario: string;
  simulated: boolean;
  source: Alert_SourceInfo;
  crowdsec_created_at: Date;
  created_at: Date;
  updated_at: Date;
}