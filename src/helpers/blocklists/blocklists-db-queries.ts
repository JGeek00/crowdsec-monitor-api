import { literal } from 'sequelize';
import { BlocklistIpsTable } from '@/models';

export const BLOCKLISTS_COUNT_API_IPS_ATTRIBUTE: [ReturnType<typeof literal>, string] = [
  literal('(SELECT COUNT(*) FROM blocklist_ips WHERE blocklist_ips.blocklist_id = "BlocklistsTable"."id")'),
  'count_ips',
];

export const BLOCKLISTS_COUNT_CS_IPS_ATTRIBUTE: [ReturnType<typeof literal>, string] = [
  literal('(SELECT COUNT(*) FROM blocklist_ips WHERE blocklist_ips.cs_blocklist_id = "CsBlocklistsTable"."id")'),
  'count_ips',
];

export const BLOCKLISTS_IPS_INCLUDE_OPTION = {
  model: BlocklistIpsTable,
  as: 'blocklistIps',
  attributes: { exclude: ['created_at', 'updated_at'] },
};
