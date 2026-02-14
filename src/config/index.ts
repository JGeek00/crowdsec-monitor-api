import dotenv from 'dotenv';
import { defaults } from './defaults';

dotenv.config();

// Parse rate limit from environment variable (format: <requests>/<minutes>)
const parseRateLimit = (rateLimitStr: string | undefined): { max: number; windowMs: number } | null => {
  if (!rateLimitStr) {
    return null;
  }

  const parts = rateLimitStr.split('/');
  if (parts.length !== 2) {
    console.warn(`ERROR: Invalid RATE_LIMIT format: "${rateLimitStr}". Expected format: <requests>/<minutes> (e.g., "100/15"). Rate limiting disabled.`);
    return null;
  }

  const max = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(max) || isNaN(minutes) || max <= 0 || minutes <= 0) {
    console.warn(`ERROR: Invalid RATE_LIMIT values: "${rateLimitStr}". Both requests and minutes must be positive numbers. Rate limiting disabled.`);
    return null;
  }

  return {
    max,
    windowMs: minutes * 60 * 1000,
  };
};

export const config = {
  server: {
    port: parseInt(process.env.PORT || String(defaults.server.port), 10),
    nodeEnv: process.env.NODE_ENV || defaults.server.nodeEnv,
  },
  crowdsec: {
    lapiUrl: process.env.CROWDSEC_LAPI_URL || defaults.crowdsec.lapiUrl,
    user: process.env.CROWDSEC_USER || defaults.crowdsec.user,
    password: process.env.CROWDSEC_PASSWORD || defaults.crowdsec.password,
  },
  database: {
    path: process.env.DB_PATH || defaults.database.path,
    retention: process.env.DATA_RETENTION || undefined,
  },
  sync: {
    intervalSeconds: process.env.SYNC_INTERVAL_SECONDS 
      ? parseInt(process.env.SYNC_INTERVAL_SECONDS, 10) 
      : defaults.sync.intervalSeconds,
  },
  auth: {
    apiPassword: process.env.API_PASSWORD || undefined,
  },
  rateLimit: parseRateLimit(process.env.RATE_LIMIT),
};

export { defaults } from './defaults';
