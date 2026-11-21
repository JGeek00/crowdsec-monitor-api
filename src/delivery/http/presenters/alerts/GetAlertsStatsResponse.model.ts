export interface GetAlertsStatsResponse {
  total: number;
  simulated: number;
  real: number;
  appsecTotal: number;
  topScenarios: GetAlertsStatsResponse_TopScenario[];
  topAppsecRules: GetAlertsStatsResponse_TopAppsecRule[];
  topAppsecHosts: GetAlertsStatsResponse_TopAppsecHost[];
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

export interface GetAlertsStatsResponse_TopAppsecRule {
  rule: string;
  count: number;
}

export interface GetAlertsStatsResponse_TopAppsecHost {
  host: string;
  count: number;
}
