import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  crowdsec: {
    lapiUrl: process.env.CROWDSEC_LAPI_URL || 'http://localhost:8080',
    user: process.env.CROWDSEC_USER || '',
    password: process.env.CROWDSEC_PASSWORD || '',
  },
  database: {
    path: process.env.DB_PATH || './database/crowdsec.db',
  },
  sync: {
    schedule: process.env.SYNC_SCHEDULE || '*/5 * * * *', // Every 5 minutes by default
  },
};
