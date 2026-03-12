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
    blocklistIpsBanDuration: '24h',
    apiBlocklistsRefreshTime: 14400, // 4 hours
    apiBlocklistsSyncTime: 900, // 15 min
    crowdsecBlocklistsRefreshTime: 3600, // 1 hour
    blocklistReconcileTime: 3600, // 1 hour
  },
  statistics: {
    topItemsLimit: 10, // Default limit for top items in statistics
  },
};
