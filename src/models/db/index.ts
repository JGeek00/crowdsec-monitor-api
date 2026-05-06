import AlertsTable from '@/models/db/Alerts';
import DecisionsTable from '@/models/db/Decisions';
import BlocklistsTable from '@/models/db/Blocklists';
import BlocklistIpsTable from '@/models/db/BlocklistIps';
import CsBlocklistsTable from '@/models/db/CsBlocklists';
import { Migration } from '@/models/db/Migration';

// Define associations
AlertsTable.hasMany(DecisionsTable, {
  sourceKey: 'id',
  foreignKey: 'alert_id',
  as: 'decisions',
});

DecisionsTable.belongsTo(AlertsTable, {
  foreignKey: 'alert_id',
  as: 'alert',
});

BlocklistsTable.hasMany(BlocklistIpsTable, {
  sourceKey: 'id',
  foreignKey: 'blocklist_id',
  as: 'blocklistIps',
});

BlocklistIpsTable.belongsTo(BlocklistsTable, {
  foreignKey: 'blocklist_id',
  as: 'blocklist',
});

CsBlocklistsTable.hasMany(BlocklistIpsTable, {
  sourceKey: 'id',
  foreignKey: 'cs_blocklist_id',
  as: 'blocklistIps',
});

BlocklistIpsTable.belongsTo(CsBlocklistsTable, {
  foreignKey: 'cs_blocklist_id',
  as: 'csBlocklist',
});

export { AlertsTable, DecisionsTable, BlocklistsTable, BlocklistIpsTable, CsBlocklistsTable, Migration };
