import { Decision, Pagination } from "@/models";

export interface GetDecisionsResponse {
  filtering: DecisionsFiltering;
  items: Decision[];
  pagination?: Pagination;
  total?: number;
}

interface DecisionsFiltering {
  countries: string[];
  ipOwners: string[];
}
