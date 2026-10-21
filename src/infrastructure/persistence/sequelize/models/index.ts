import AlertsTable from '@/infrastructure/persistence/sequelize/models/Alerts';
import DecisionsTable from '@/infrastructure/persistence/sequelize/models/Decisions';
import BlocklistsTable from '@/infrastructure/persistence/sequelize/models/Blocklists';
import BlocklistIpsTable from '@/infrastructure/persistence/sequelize/models/BlocklistIps';
import CsBlocklistsTable from '@/infrastructure/persistence/sequelize/models/CsBlocklists';
import NotificationsTable from '@/infrastructure/persistence/sequelize/models/Notifications';
import NotificationChannelsTable from '@/infrastructure/persistence/sequelize/models/NotificationChannels';
import { Migration } from '@/infrastructure/persistence/sequelize/models/Migration';

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

export {
  AlertsTable,
  DecisionsTable,
  BlocklistsTable,
  BlocklistIpsTable,
  CsBlocklistsTable,
  NotificationsTable,
  NotificationChannelsTable,
  Migration,
};
