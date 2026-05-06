export interface GetAlertsStatsResponse {
  total: number;
  simulated: number;
  real: number;
  topScenarios: GetAlertsStatsResponse_TopScenario[];
  topCountries: GetAlertsStatsResponse_TopCountry[];
  topOrganizations: GetAlertsStatsResponse_TopOrganization[];
}

export interface GetAlertsStatsResponse_TopCountry {
  country: string;
  count: number;
}

export interface GetAlertsStatsResponse_TopOrganization {
  organization: string;
  count: number;
}

export interface GetAlertsStatsResponse_TopScenario {
  scenario: string;
  count: number;
}
