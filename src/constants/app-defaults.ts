import { ALERT_ORIGINS_FETCH } from './crowdsec-taxonomy';

export default {
  alerts: {
    originsFetch: [...ALERT_ORIGINS_FETCH],
  },
  blocklists: {
    scenarioRegex: /^external\/blocklist \((.+)\)$/,
    importOrigin: 'cs-monitor-blocklist-import',
    blocklistIpsDeleteChunkSize: 1000, // Number of IPs to delete in a single database transaction when disabling/deleting a blocklist managed by CrowdSec Monitor
    csBlocklistDbWriteChunkSize: 1000, // Number of IPs to write on the local DB in a single database transaction when syncing CrowdSec blocklists, completely independent from blocklists managed by CrowdSec Monitor
  },
  scheduler: {
    versionCheck: 'version-check',
    dataSync: 'data-sync',
    lapiCheck: 'lapi-check',
    blocklistsSync: 'blocklists-sync',
    csBlocklistsSync: 'cs-blocklists-sync',
  },
  notifications: {
    defaultCooldownSeconds: 60,
  },
};
