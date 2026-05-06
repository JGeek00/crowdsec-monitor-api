import { AlertDb } from '@/models/db/Alert';
import { Decision } from '@/models/db/Decision';
import { Blocklist } from '@/models/db/Blocklist';
import { BlocklistIp } from '@/models/db/BlocklistIp';
import { CsBlocklist } from '@/models/db/CsBlocklist';
import { Migration } from '@/models/db/Migration';

// Define associations
AlertDb.hasMany(Decision, {
  sourceKey: 'id',
  foreignKey: 'alert_id',
  as: 'decisions',
});

Decision.belongsTo(AlertDb, {
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

export { AlertDb, Decision, Blocklist, BlocklistIp, CsBlocklist, Migration };

export * from '@/models/db/Alert';
export * from '@/models/db/Blocklist';
export * from '@/models/db/BlocklistIp';
export * from '@/models/db/CsBlocklist';
export * from '@/models/db/Decision';
export * from '@/models/db/Migration';