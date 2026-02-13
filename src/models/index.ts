import { Alert } from './Alert';
import { Decision } from './Decision';

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

export { Alert, Decision };
