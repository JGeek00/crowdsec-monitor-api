import type { Alert, Alert_EventData, ParsedMetaData } from '@/models';

/**
 * Alert event as delivered in API responses: the timestamp is rendered in the
 * canonical format and is nullable when the stored value cannot be interpreted
 * as an instant (REQ-005).
 */
export interface AlertDeliveryEvent extends Omit<Alert_EventData<ParsedMetaData>, 'timestamp'> {
  timestamp: string | null;
}

/**
 * Alert as delivered in API responses: event timestamps and date-typed fields
 * (`crowdsec_created_at`, `start_at`, `stop_at`) are rendered in the canonical
 * timestamp format (`YYYY-MM-DD HH:MM:SS ±ZZZZ ZZZ`) instead of raw storage types.
 */
export type AlertDelivery = Omit<Alert<ParsedMetaData>, 'events' | 'crowdsec_created_at' | 'start_at' | 'stop_at'> & {
  events: AlertDeliveryEvent[];
  crowdsec_created_at: string | null;
  start_at: string | null;
  stop_at: string | null;
};
