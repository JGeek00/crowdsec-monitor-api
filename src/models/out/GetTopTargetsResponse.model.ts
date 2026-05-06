export interface GetTopTargetsResponse {
  data: TopTarget[];
}

export interface TopTarget {
  target: string;
  amount: number;
}
