export default {
  alerts: {
    originsFetch:['crowdsec', 'cscli', 'console', 'appsec'],
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
    blocklistReconcile: 'blocklist-reconcile',
  }
}