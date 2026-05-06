export interface GetAlertsQueryParams {
  limit?: number;
  offset?: number;
  unpaged?: boolean;
  scenario?: string;
  simulated?: string;
  ip_address?: string;
  country?: string;
  ip_owner?: string;
  target?: string;
}