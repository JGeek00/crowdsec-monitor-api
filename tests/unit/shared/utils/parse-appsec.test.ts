import { describe, expect, it } from 'vitest';
import {
  ALERT_KINDS,
  APPSEC_KINDS,
  isAppSecKind,
  isExcludedOrigin,
  isExcludedScenario,
} from '@/constants/crowdsec-taxonomy';
import { extractAppSecSummary } from '@/shared/utils/parse-appsec';

const WAF_ALERT = {
  kind: 'waf',
  scenario: 'crowdsecurity/vpatch-env-access',
  meta: [
    { key: 'method', value: '["GET"]' },
    { key: 'target_uri', value: '["/.env"]' },
    { key: 'user_agent', value: '["Mozilla/5.0"]' },
  ],
  events: [
    {
      timestamp: '2026-11-21 20:30:31 +0000 UTC',
      meta: [
        { key: 'rule_name', value: 'crowdsecurity/vpatch-env-access' },
        { key: 'uri', value: '/.env' },
        { key: 'target_fqdn', value: 'linkwarden.jgeek00.com' },
        { key: 'data' },
      ],
    },
  ],
};

describe('crowdsec-taxonomy', () => {
  it('exposes kinds as const', () => {
    expect(APPSEC_KINDS).toEqual(['waf', 'bot-detection']);
    expect(ALERT_KINDS).toContain('crowdsec');
  });

  it('classifies waf and bot-detection as AppSec', () => {
    expect(isAppSecKind('waf')).toBe(true);
    expect(isAppSecKind('bot-detection')).toBe(true);
    expect(isAppSecKind('crowdsec')).toBe(false);
    expect(isAppSecKind(undefined)).toBe(false);
  });

  it('excludes blocklist origins and scenarios', () => {
    expect(isExcludedOrigin('lists')).toBe(true);
    expect(isExcludedOrigin('cs-monitor-blocklist-import')).toBe(true);
    expect(isExcludedOrigin('crowdsec')).toBe(false);
    expect(isExcludedScenario('external/blocklist (my-list)')).toBe(true);
    expect(isExcludedScenario('crowdsecurity/vpatch-env-access')).toBe(false);
  });
});

describe('extractAppSecSummary', () => {
  it('extracts rule, uri, host and method from a real WAF sample', () => {
    expect(extractAppSecSummary(WAF_ALERT)).toMatchObject({
      rule: 'crowdsecurity/vpatch-env-access',
      uri: '/.env',
      host: 'linkwarden.jgeek00.com',
      method: 'GET',
    });
  });

  it('tolerates missing value and empty leakspeed-style inputs', () => {
    expect(
      extractAppSecSummary({ meta: [{ key: 'data' }], events: [] }),
    ).toBeNull();
  });

  it('is generic, not hardcoded to .env', () => {
    const summary = extractAppSecSummary({
      meta: [{ key: 'method', value: 'POST' }],
      events: [
        {
          timestamp: '2026-11-21T20:30:31Z',
          meta: [
            { key: 'rule_name', value: 'crowdsecurity/vpatch-CVE-2023-42793' },
            { key: 'uri', value: '/rpc2' },
            { key: 'target_fqdn', value: 'example.com' },
          ],
        },
      ],
    });
    expect(summary?.rule).toBe('crowdsecurity/vpatch-CVE-2023-42793');
    expect(summary?.uri).toBe('/rpc2');
  });
});
