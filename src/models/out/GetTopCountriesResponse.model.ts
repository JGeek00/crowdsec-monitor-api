export interface GetTopCountriesResponse {
  data: TopCountry[];
}

export interface TopCountry {
  countryCode: string;
  amount: number;
}
