import { describe, it, expect } from 'vitest';
import { createDecisionValidators, ipParamValidators } from '@/validators/decision.validator';
import { validationResult } from 'express-validator';

async function runBodyValidation(reqBody: Record<string, unknown>) {
  const req = { body: reqBody } as any;
  const res = {} as any;
  const next = () => {};
  for (const validator of createDecisionValidators) {
    await validator(req, res, next);
  }
  return validationResult(req);
}

async function runParamValidation(paramIp: string) {
  const req = { params: { ip: paramIp } } as any;
  const res = {} as any;
  const next = () => {};
  for (const validator of ipParamValidators) {
    await validator(req, res, next);
  }
  return validationResult(req);
}

describe('createDecisionValidators', () => {
  it('passes for valid decision body', async () => {
    const result = await runBodyValidation({
      ip: '1.2.3.4',
      duration: '4h',
      reason: 'test reason',
      type: 'ban',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for IPv6 address', async () => {
    const result = await runBodyValidation({
      ip: '::1',
      duration: '15m',
      reason: 'test',
      type: 'ban',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails when ip is missing', async () => {
    const result = await runBodyValidation({
      duration: '4h',
      reason: 'test',
      type: 'ban',
    });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('ip is required'))).toBe(true);
  });

  it('fails when ip is invalid', async () => {
    const result = await runBodyValidation({
      ip: 'bad-ip',
      duration: '4h',
      reason: 'test',
      type: 'ban',
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when duration is missing', async () => {
    const result = await runBodyValidation({
      ip: '1.2.3.4',
      reason: 'test',
      type: 'ban',
    });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('duration is required'))).toBe(true);
  });

  it('fails when duration has invalid format', async () => {
    const result = await runBodyValidation({
      ip: '1.2.3.4',
      duration: '4x',
      reason: 'test',
      type: 'ban',
    });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('duration must be in format'))).toBe(true);
  });

  it('passes for mixed duration format (1d4h15m)', async () => {
    const result = await runBodyValidation({
      ip: '1.2.3.4',
      duration: '1d4h15m',
      reason: 'test',
      type: 'ban',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails when reason is missing', async () => {
    const result = await runBodyValidation({
      ip: '1.2.3.4',
      duration: '4h',
      type: 'ban',
    });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('reason is required'))).toBe(true);
  });

  it('fails when reason contains invalid characters', async () => {
    const result = await runBodyValidation({
      ip: '1.2.3.4',
      duration: '4h',
      reason: 'test!@#$',
      type: 'ban',
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when type is missing', async () => {
    const result = await runBodyValidation({
      ip: '1.2.3.4',
      duration: '4h',
      reason: 'test',
    });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('type is required'))).toBe(true);
  });

  it('fails when type is invalid', async () => {
    const result = await runBodyValidation({
      ip: '1.2.3.4',
      duration: '4h',
      reason: 'test',
      type: 'invalid-type',
    });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('type must be one of'))).toBe(true);
  });

  it('passes for all valid types', async () => {
    for (const type of ['ban', 'captcha', 'throttle', 'allow']) {
      const result = await runBodyValidation({
        ip: '1.2.3.4',
        duration: '4h',
        reason: 'test',
        type,
      });
      expect(result.isEmpty()).toBe(true);
    }
  });
});

describe('ipParamValidators', () => {
  it('passes for valid IPv4 param', async () => {
    const result = await runParamValidation('1.2.3.4');
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid IPv6 param', async () => {
    const result = await runParamValidation('::1');
    expect(result.isEmpty()).toBe(true);
  });

  it('fails for invalid IP param', async () => {
    const result = await runParamValidation('not-an-ip');
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('ip must be a valid'))).toBe(true);
  });
});
