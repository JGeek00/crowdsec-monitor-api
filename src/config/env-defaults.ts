/**
 * Default configuration values
 */
export const defaults = {
  server: {
    port: 3000,
    nodeEnv: 'development',
  },
  crowdsec: {
    lapiUrl: 'http://localhost:8080',
    user: '',
    password: '',
  },
  database: {
    path: './database/crowdsec.db',
  },
  intervals: {
    alertsSync: 30, // 60 seconds
    lapiCheckInterval: 30, // 30 seconds
    blocklistIpsBanDuration: '24h',
    apiBlocklistsRefreshTime: 43200, // 12 hours
    crowdsecBlocklistsRefreshTime: 3600, // 1 hour
  },
  dns: {
    server: 'cloudflare', // Default DNS server for domain checks
  },
  statistics: {
    topItemsLimit: 10, // Default limit for top items in statistics
  },
  processes: {
    finishedRetentionTime: 3600, // 1 hour in seconds
  },
  blocklists: {
    writeChunkSize: 1000, // Number of IPs to write in a single database transaction when syncing blocklists
  },
  logs: {
    level: 'info',
    httpRequests: true,
  },
};
