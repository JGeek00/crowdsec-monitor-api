import { Blocklist, CsBlocklist } from '@/models';

/**
 * Blocklist as delivered: date-typed fields rendered in the canonical timestamp format.
 */
type CanonicalDateFields<T> = Omit<T, 'added_date' | 'last_refresh_attempt' | 'last_successful_refresh'> & {
  added_date?: string | null;
  last_refresh_attempt?: string | null;
  last_successful_refresh?: string | null;
};

export interface GetBlocklistResponse {
  data: CanonicalDateFields<Blocklist> | CanonicalDateFields<CsBlocklist>;
}
