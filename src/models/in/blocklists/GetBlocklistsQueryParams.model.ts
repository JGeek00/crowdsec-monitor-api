export interface GetBlocklistsQueryParams {
  limit?: number;
  offset?: number;
  unpaged?: boolean;
  include_ips?: string;
  get_only?: string;
}
