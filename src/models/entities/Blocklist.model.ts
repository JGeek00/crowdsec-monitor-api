export interface Blocklist {
  id: number;
  url: string;
  name: string;
  enabled: boolean;
  added_date: Date;
  last_refresh_attempt: Date | null;
  last_successful_refresh: Date | null;
  last_refresh_failed: boolean | null;
}

export const BLOCKLIST_TYPE = {
  API: 'api',
  CROWDSEC: 'cs',
} as const;
export type BlocklistType = (typeof BLOCKLIST_TYPE)[keyof typeof BLOCKLIST_TYPE];
