export interface GetStatisticsResponse {
  alertsLast24Hours: number;
  activeDecisions: number;
  activityHistory: GetStatisticsResponse_ActivityHistory[];
  topCountries: GetStatisticsResponse_TopCountries[];
  topScenarios: GetStatisticsResponse_TopScenarios[];
  topIpOwners: GetStatisticsResponse_TopIpOwners[];
  topTargets: GetStatisticsResponse_TopTargets[];
}

export interface GetStatisticsResponse_ActivityHistory {
  date: string;
  amountAlerts: number;
  amountDecisions: number;
}

export interface GetStatisticsResponse_TopCountries {
  countryCode: string;
  amount: number;
}

export interface GetStatisticsResponse_TopIpOwners {
  ipOwner: string;
  amount: number;
}

export interface GetStatisticsResponse_TopTargets {
  target: string;
  amount: number;
}

export interface GetStatisticsResponse_TopScenarios {
  scenario: string;
  amount: number;
}
