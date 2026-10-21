/** Query params accepted by the blocklists list endpoints (input DTO). */
export interface GetBlocklistsQueryParams {
  limit?: number;
  offset?: number;
  unpaged?: boolean;
  include_ips?: string;
  get_only?: string;
}
