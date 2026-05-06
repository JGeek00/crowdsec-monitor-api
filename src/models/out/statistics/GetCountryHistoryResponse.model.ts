export interface GetCountryHistoryResponse {
  data: CountryHistory[];
}

export interface CountryHistory {
  date: string;
  amount: number;
}
