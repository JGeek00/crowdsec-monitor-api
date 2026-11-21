export const ALERT_KINDS = ['crowdsec', 'waf', 'bot-detection', 'capi', 'papi', 'cscli'] as const;

export const APPSEC_KINDS = ['waf', 'bot-detection'] as const;

export const ALERT_ORIGINS_FETCH = ['crowdsec', 'cscli', 'console', 'appsec', 'waf'] as const;

export const ALERT_ORIGINS_EXCLUDED = ['lists', 'cs-monitor-blocklist-import'] as const;

export const ALERT_SCENARIOS_EXCLUDED = [/^external\/blocklist \((.+)\)$/] as const;

export const APPSEC_SCENARIO_MARKERS = ['appsec', 'vpatch-'] as const;

export function isAppSecAlert(kind?: string | null, scenario?: string | null): boolean {
  if (isAppSecKind(kind)) return true;
  if (!kind && scenario) {
    const lower = scenario.toLowerCase();
    return (APPSEC_SCENARIO_MARKERS as readonly string[]).some((m) => lower.includes(m));
  }
  return false;
}

export type AlertKind = (typeof ALERT_KINDS)[number];
export type AppSecKind = (typeof APPSEC_KINDS)[number];
export type AlertOriginFetch = (typeof ALERT_ORIGINS_FETCH)[number];
export type AlertOriginExcluded = (typeof ALERT_ORIGINS_EXCLUDED)[number];

export function isAppSecKind(kind?: string | null): boolean {
  if (!kind) return false;
  return (APPSEC_KINDS as readonly string[]).includes(kind);
}

export function isExcludedOrigin(origin?: string | null): boolean {
  if (!origin) return false;
  return (ALERT_ORIGINS_EXCLUDED as readonly string[]).includes(origin);
}

export function isExcludedScenario(scenario?: string | null): boolean {
  if (!scenario) return false;
  return ALERT_SCENARIOS_EXCLUDED.some((re) => re.test(scenario));
}
