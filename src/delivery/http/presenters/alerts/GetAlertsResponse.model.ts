import type { AlertDelivery } from './AlertDelivery.model';
import type { Pagination } from '@/shared/models';

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
