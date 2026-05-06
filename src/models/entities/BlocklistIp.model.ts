export const BLOCKLIST_IP_ORIGIN = {
  BLOCKLIST: 'blocklist',
  CS_BLOCKLIST: 'cs_blocklist',
} as const;
export type BlocklistIpOrigin = typeof BLOCKLIST_IP_ORIGIN[keyof typeof BLOCKLIST_IP_ORIGIN];

export interface BlocklistIp {
  id: number;
  blocklist_id: number | null;
  cs_blocklist_id: string | null;
  blocklist_name: string;
  value: string;
  origin: BlocklistIpOrigin;
}
