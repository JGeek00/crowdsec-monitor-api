import { Alert } from './Alert';
import { Decision } from './Decision';
import { Blocklist } from './Blocklist';
import { BlocklistIp } from './BlocklistIp';
import { CsBlocklist } from './CsBlocklist';

// Define associations
Alert.hasMany(Decision, {
  sourceKey: 'id',
  foreignKey: 'alert_id',
  as: 'decisions',
});

Decision.belongsTo(Alert, {
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

export { Alert, Decision, Blocklist, BlocklistIp, CsBlocklist };
