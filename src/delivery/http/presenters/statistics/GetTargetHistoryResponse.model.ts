export interface GetTargetHistoryResponse {
  data: TargetHistory[];
}

export interface TargetHistory {
  date: string;
  amount: number;
}
