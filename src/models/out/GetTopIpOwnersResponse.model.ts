export interface GetTopIpOwnersResponse {
  data: TopIpOwner[];
}

export interface TopIpOwner {
  ipOwner: string;
  amount: number;
}
