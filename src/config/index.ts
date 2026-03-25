import dotenv from 'dotenv';
import { defaults } from '@/config/defaults';
import { dnsServers } from '@/constants/dns-servers';

dotenv.config();

// Validate and parse DB_MODE with its required env vars
const parseDbMode = (): 'sqlite' | 'postgres' => {
  const mode = (process.env.DB_MODE || 'sqlite').trim().toLowerCase();

  if (mode === 'sqlite') {
    if (!process.env.DB_PATH && !defaults.database.path) {
      console.error('ERROR: DB_MODE is sqlite but DB_PATH is not defined.');
      process.exit(1);
    }
    return 'sqlite';
  }

  if (mode === 'postgres') {
    const required = ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'];
    const missing = required.filter(v => !process.env[v]);
    if (missing.length > 0) {
      console.error(`ERROR: DB_MODE is postgres but the following variables are not defined: ${missing.join(', ')}`);
      process.exit(1);
    }
    return 'postgres';
  }

  console.error(`ERROR: Invalid DB_MODE "${mode}". Allowed values: "sqlite", "postgres".`);
  process.exit(1);
};

// Parse POSTGRES_HOST which may include the port (host:port or just host)
const parsePostgresHost = (hostStr?: string): { host: string; port: number } => {
  if (!hostStr) return { host: 'localhost', port: 5432 };
  const colonIdx = hostStr.lastIndexOf(':');
  if (colonIdx !== -1) {
    const port = parseInt(hostStr.slice(colonIdx + 1), 10);
    if (!isNaN(port)) {
      return { host: hostStr.slice(0, colonIdx), port };
    }
  }
  return { host: hostStr, port: 5432 };
};

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
    bouncerKey: process.env.CROWDSEC_BOUNCER_KEY || '',
  },
  database: {
    mode: parseDbMode(),
    path: process.env.DB_PATH || defaults.database.path,
    retention: process.env.DATA_RETENTION || undefined,
    postgres: (() => {
      const { host, port } = parsePostgresHost(process.env.POSTGRES_HOST);
      return {
        host,
        port,
        user: process.env.POSTGRES_USER || '',
        password: process.env.POSTGRES_PASSWORD || '',
        database: process.env.POSTGRES_DB || '',
      };
    })(),
  },
  sync: {
    intervalSeconds: process.env.SYNC_INTERVAL_SECONDS 
      ? parseInt(process.env.SYNC_INTERVAL_SECONDS, 10) 
      : defaults.intervals.alertsSync,
  },
  blocklists: {
    refreshTimeSeconds: process.env.BLOCKLISTS_REFRESH_TIME
      ? parseInt(process.env.BLOCKLISTS_REFRESH_TIME, 10)
      : defaults.intervals.apiBlocklistsRefreshTime,
  },
  crowdsecBlocklists: {
    refreshTimeSeconds: process.env.CROWDSEC_BLOCKLISTS_REFRESH_TIME
      ? parseInt(process.env.CROWDSEC_BLOCKLISTS_REFRESH_TIME, 10)
      : defaults.intervals.crowdsecBlocklistsRefreshTime,
  },
  blocklistReconcile: {
    intervalSeconds: process.env.BLOCKLIST_RECONCILE_TIME
      ? parseInt(process.env.BLOCKLIST_RECONCILE_TIME, 10)
      : defaults.intervals.blocklistReconcileTime,
  },
  blocklistBanDuration: process.env.BLOCKLIST_IPS_BAN_DURATION || defaults.intervals.blocklistIpsBanDuration,
  auth: {
    apiPassword: process.env.API_PASSWORD || undefined,
  },
  rateLimit: parseRateLimit(process.env.RATE_LIMIT),
  dns: {
    server: (() => {
      const raw = (process.env.DOMAIN_CHECK_DNS_SERVER || defaults.dns.server).trim().toLowerCase();
      const key = raw === 'opendns' ? 'openDns' : raw as keyof typeof dnsServers;
      if (!(key in dnsServers)) {
        console.warn(`WARNING: Unknown DOMAIN_CHECK_DNS_SERVER "${raw}". Falling back to "${defaults.dns.server}".`);
        return dnsServers[defaults.dns.server as keyof typeof dnsServers];
      }
      return dnsServers[key];
    })(),
  },
};

export { defaults } from '@/config/defaults';
