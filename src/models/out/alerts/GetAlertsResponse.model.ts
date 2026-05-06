import { Alert, ParsedMetaData } from '@/models';
import { Pagination } from "@/models";

export interface GetAlertsResponse {
  filtering: AlertsFiltering;
  items: Alert<ParsedMetaData>[];
  pagination?: Pagination;
  total?: number;
}

interface AlertsFiltering {
  countries: string[];
  scenarios: string[];
  ipOwners: string[];
  targets: string[];
}

