export interface GetDecisionsStatsResponse {
  total: number;
  byType: GetDecisionsStatsResponse_ByType[];
  byScope: GetDecisionsStatsResponse_ByScope[];
}

export interface GetDecisionsStatsResponse_ByScope {
  scope: string;
  count: number;
}

export interface GetDecisionsStatsResponse_ByType {
  type: string;
  count: number;
}
