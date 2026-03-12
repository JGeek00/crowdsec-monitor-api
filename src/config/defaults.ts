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
  sync: {
    intervalSeconds: 30, // 30 seconds
  },
  blocklists: {
    refreshTimeSeconds: 86400, // 1 day
  },
  statistics: {
    topItemsLimit: 10, // Default limit for top items in statistics
  },
};
