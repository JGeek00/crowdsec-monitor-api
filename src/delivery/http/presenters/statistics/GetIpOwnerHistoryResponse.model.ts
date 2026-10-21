export interface GetIpOwnerHistoryResponse {
  data: IpOwnerHistory[];
}

export interface IpOwnerHistory {
  date: string;
  amount: number;
}
