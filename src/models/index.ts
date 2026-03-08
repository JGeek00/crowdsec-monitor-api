import { Alert } from './Alert';
import { Decision } from './Decision';
import { Blocklist } from './Blocklist';
import { BlocklistIp } from './BlocklistIp';

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

export { Alert, Decision, Blocklist, BlocklistIp };
