import { AlertDelivery, Pagination } from '@/models';

export interface GetAlertsResponse {
  filtering: AlertsFiltering;
  items: AlertDelivery[];
  pagination?: Pagination;
  total?: number;
}

interface AlertsFiltering {
  countries: string[];
  scenarios: string[];
  ipOwners: string[];
  targets: string[];
}
