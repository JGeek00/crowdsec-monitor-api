export interface GetScenarioHistoryResponse {
  data: ScenarioHistory[];
}

export interface ScenarioHistory {
  date: string;
  amount: number;
}
