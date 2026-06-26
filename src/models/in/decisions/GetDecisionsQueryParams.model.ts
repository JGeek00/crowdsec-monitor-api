export interface GetDecisionsQueryParams {
  limit?: number;
  offset?: number;
  unpaged?: boolean;
  type?: string;
  scope?: string;
  value?: string;
  simulated?: boolean;
  scenario?: string;
  ip_address?: string;
  country?: string;
  ip_owner?: string;
  only_active?: boolean;
}
