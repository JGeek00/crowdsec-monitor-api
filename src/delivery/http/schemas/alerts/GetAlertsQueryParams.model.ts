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
  /** `yyyy-MM-dd:hh:mm:ss` in UTC, inclusive; validated by the list use case. */
  start_timestamp?: string;
  /** `yyyy-MM-dd:hh:mm:ss` in UTC, inclusive; validated by the list use case. */
  end_timestamp?: string;
}
