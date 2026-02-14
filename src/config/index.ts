import dotenv from 'dotenv';

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
    retention: process.env.DATA_RETENTION || undefined,
  },
  sync: {
    schedule: process.env.SYNC_SCHEDULE || '*/5 * * * *', // Every 5 minutes by default
  },
  auth: {
    apiPassword: process.env.API_PASSWORD || undefined,
  },
  rateLimit: parseRateLimit(process.env.RATE_LIMIT),
};
