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
};
