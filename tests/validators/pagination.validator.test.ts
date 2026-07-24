import { describe, it, expect } from 'vitest';
import { paginationValidators, alertQueryValidators, decisionQueryValidators } from '@/validators/pagination.validator';
import { validationResult } from 'express-validator';

async function runPaginationValidation(query: Record<string, unknown>) {
  const req = { query } as any;
  const res = {} as any;
  const next = () => {};
  for (const validator of paginationValidators) {
    await validator(req, res, next);
  }
  return validationResult(req);
}

async function runAlertQueryValidation(query: Record<string, unknown>) {
  const req = { query } as any;
  const res = {} as any;
  const next = () => {};
  for (const validator of alertQueryValidators) {
    await validator(req, res, next);
  }
  return validationResult(req);
}

async function runDecisionQueryValidation(query: Record<string, unknown>) {
  const req = { query } as any;
  const res = {} as any;
  const next = () => {};
  for (const validator of decisionQueryValidators) {
    await validator(req, res, next);
  }
  return validationResult(req);
}

describe('paginationValidators', () => {
  it('passes when no query params are provided (all optional)', async () => {
    const result = await runPaginationValidation({});
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid limit', async () => {
    const result = await runPaginationValidation({ limit: '10' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid offset', async () => {
    const result = await runPaginationValidation({ offset: '0' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid limit and offset', async () => {
    const result = await runPaginationValidation({ limit: '50', offset: '100' });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails when limit is not a positive integer', async () => {
    const result = await runPaginationValidation({ limit: '-1' });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('limit must be a positive integer'))).toBe(true);
  });

  it('fails when limit is zero', async () => {
    const result = await runPaginationValidation({ limit: '0' });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when limit is not a number', async () => {
    const result = await runPaginationValidation({ limit: 'abc' });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when offset is negative', async () => {
    const result = await runPaginationValidation({ offset: '-1' });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('offset must be a non-negative integer'))).toBe(true);
  });

  it('fails when offset is not a number', async () => {
    const result = await runPaginationValidation({ offset: 'abc' });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid boolean unpaged', async () => {
    const result = await runPaginationValidation({ unpaged: 'true' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid unpaged=false', async () => {
    const result = await runPaginationValidation({ unpaged: 'false' });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails when unpaged is not a boolean', async () => {
    const result = await runPaginationValidation({ unpaged: 'not-boolean' });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for all valid params together', async () => {
    const result = await runPaginationValidation({ limit: '10', offset: '0', unpaged: 'true' });
    expect(result.isEmpty()).toBe(true);
  });
});

describe('alertQueryValidators', () => {
  it('passes for valid scenario string', async () => {
    const result = await runAlertQueryValidation({ scenario: 'crowdsec/ssh-bf' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid scenario array', async () => {
    const result = await runAlertQueryValidation({ scenario: ['crowdsec/ssh-bf', 'crowdsec/http-bf'] });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid scenario (non-string array)', async () => {
    const result = await runAlertQueryValidation({ scenario: [123] });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid simulated boolean', async () => {
    const result = await runAlertQueryValidation({ simulated: 'true' });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid simulated value', async () => {
    const result = await runAlertQueryValidation({ simulated: 'not-boolean' });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid country code', async () => {
    const result = await runAlertQueryValidation({ country: 'US' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for lowercase country code', async () => {
    const result = await runAlertQueryValidation({ country: 'us' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for country code array', async () => {
    const result = await runAlertQueryValidation({ country: ['US', 'DE'] });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid country code', async () => {
    const result = await runAlertQueryValidation({ country: 'USA' });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails for non-string country', async () => {
    const result = await runAlertQueryValidation({ country: ['US', 123] });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid ip_address', async () => {
    const result = await runAlertQueryValidation({ ip_address: '1.2.3.4' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid IPv6 address', async () => {
    const result = await runAlertQueryValidation({ ip_address: '::1' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for ip_address array', async () => {
    const result = await runAlertQueryValidation({ ip_address: ['1.2.3.4', '5.6.7.8'] });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid ip_address', async () => {
    const result = await runAlertQueryValidation({ ip_address: 'bad-ip' });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails for mixed valid/invalid ip_address array', async () => {
    const result = await runAlertQueryValidation({ ip_address: ['1.2.3.4', 'bad-ip'] });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid ip_owner string', async () => {
    const result = await runAlertQueryValidation({ ip_owner: 'Example-AS' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid ip_owner array', async () => {
    const result = await runAlertQueryValidation({ ip_owner: ['Example-AS', 'Other-AS'] });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid ip_owner (non-string array)', async () => {
    const result = await runAlertQueryValidation({ ip_owner: [true] });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid target string', async () => {
    const result = await runAlertQueryValidation({ target: 'example.com' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid target array', async () => {
    const result = await runAlertQueryValidation({ target: ['example.com', 'other.com'] });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid target (non-string)', async () => {
    const result = await runAlertQueryValidation({ target: 42 });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails for invalid target (non-string array)', async () => {
    const result = await runAlertQueryValidation({ target: [42] });
    expect(result.isEmpty()).toBe(false);
  });
});

describe('decisionQueryValidators', () => {
  it('passes for valid type param', async () => {
    const result = await runDecisionQueryValidation({ type: 'ban' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for all valid types', async () => {
    for (const t of ['ban', 'captcha', 'throttle', 'allow']) {
      const result = await runDecisionQueryValidation({ type: t });
      expect(result.isEmpty()).toBe(true);
    }
  });

  it('fails for invalid type', async () => {
    const result = await runDecisionQueryValidation({ type: 'invalid' });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid scope', async () => {
    const result = await runDecisionQueryValidation({ scope: 'Ip' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid scope Range', async () => {
    const result = await runDecisionQueryValidation({ scope: 'Range' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for lowercase scope', async () => {
    const result = await runDecisionQueryValidation({ scope: 'ip' });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid scope', async () => {
    const result = await runDecisionQueryValidation({ scope: 'Invalid' });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid value', async () => {
    const result = await runDecisionQueryValidation({ value: '1.2.3.4' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid scenario string', async () => {
    const result = await runDecisionQueryValidation({ scenario: 'crowdsec/ssh-bf' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid scenario array', async () => {
    const result = await runDecisionQueryValidation({ scenario: ['crowdsec/ssh-bf'] });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid scenario (non-string)', async () => {
    const result = await runDecisionQueryValidation({ scenario: 42 });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid ip_address', async () => {
    const result = await runDecisionQueryValidation({ ip_address: '1.2.3.4' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid IPv6 ip_address', async () => {
    const result = await runDecisionQueryValidation({ ip_address: '::1' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for ip_address array', async () => {
    const result = await runDecisionQueryValidation({ ip_address: ['1.2.3.4'] });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid ip_address', async () => {
    const result = await runDecisionQueryValidation({ ip_address: 'bad-ip' });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid country code', async () => {
    const result = await runDecisionQueryValidation({ country: 'US' });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid country code', async () => {
    const result = await runDecisionQueryValidation({ country: 'USA' });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid country code array', async () => {
    const result = await runDecisionQueryValidation({ country: ['US', 'DE'] });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid ip_owner string', async () => {
    const result = await runDecisionQueryValidation({ ip_owner: 'Example-AS' });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid ip_owner array', async () => {
    const result = await runDecisionQueryValidation({ ip_owner: ['Example-AS'] });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid ip_owner', async () => {
    const result = await runDecisionQueryValidation({ ip_owner: 42 });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid only_active boolean', async () => {
    const result = await runDecisionQueryValidation({ only_active: 'true' });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid only_active', async () => {
    const result = await runDecisionQueryValidation({ only_active: 'not-bool' });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes for valid include_decisions boolean', async () => {
    const result = await runDecisionQueryValidation({ include_decisions: 'false' });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid include_decisions', async () => {
    const result = await runDecisionQueryValidation({ include_decisions: 'maybe' });
    expect(result.isEmpty()).toBe(false);
  });
});
