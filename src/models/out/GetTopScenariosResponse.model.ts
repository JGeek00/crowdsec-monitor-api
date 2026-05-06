export interface GetTopScenariosResponse {
  data: TopScenario[];
}

export interface TopScenario {
  scenario: string;
  amount: number;
}
