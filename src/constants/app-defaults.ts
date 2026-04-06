export default {
  alerts: {
    originsFetch:['crowdsec', 'cscli', 'console', 'appsec'],
  },
  blocklists: {
    scenarioRegex: /^external\/blocklist \((.+)\)$/,
    writeChunkSize: 1000,
    importOrigin: 'cs-monitor-blocklist-import',
  },
  scheduler: {
    versionCheck: 'version-check',
    dataSync: 'data-sync',
    blocklistsSync: 'blocklists-sync',
    csBlocklistsSync: 'cs-blocklists-sync',
    blocklistReconcile: 'blocklist-reconcile',
  }
}