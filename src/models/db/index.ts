import { AlertsTable } from '@/models/db/Alerts';
import { DecisionsTable } from '@/models/db/Decisions';
import { Blocklist } from '@/models/db/Blocklist';
import { BlocklistIp } from '@/models/db/BlocklistIp';
import { CsBlocklist } from '@/models/db/CsBlocklist';
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

Blocklist.hasMany(BlocklistIp, {
  sourceKey: 'id',
  foreignKey: 'blocklist_id',
  as: 'blocklistIps',
});

BlocklistIp.belongsTo(Blocklist, {
  foreignKey: 'blocklist_id',
  as: 'blocklist',
});

CsBlocklist.hasMany(BlocklistIp, {
  sourceKey: 'id',
  foreignKey: 'cs_blocklist_id',
  as: 'blocklistIps',
});

BlocklistIp.belongsTo(CsBlocklist, {
  foreignKey: 'cs_blocklist_id',
  as: 'csBlocklist',
});

export { AlertsTable, DecisionsTable, Blocklist, BlocklistIp, CsBlocklist, Migration };

export * from '@/models/db/Alerts';
export * from '@/models/db/Blocklist';
export * from '@/models/db/BlocklistIp';
export * from '@/models/db/CsBlocklist';
export * from '@/models/db/Decisions';
export * from '@/models/db/Migration';