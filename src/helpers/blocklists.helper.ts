import { literal } from "sequelize";
import { BlocklistIp } from "@/models";

export const BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE: [ReturnType<typeof literal>, string] = [
  literal('(SELECT COUNT(*) FROM blocklist_ips WHERE blocklist_ips.blocklist_id = "Blocklist"."id")'),
  'count_ips',
];

export const BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE: [ReturnType<typeof literal>, string] = [
  literal('(SELECT COUNT(*) FROM blocklist_ips WHERE blocklist_ips.cs_blocklist_id = "CsBlocklist"."id")'),
  'count_ips',
];

export const BLOCKLISTS_IPS_INCLUDE_OPTION = {
  model: BlocklistIp,
  as: 'blocklistIps',
  attributes: { exclude: ['created_at', 'updated_at'] },
};