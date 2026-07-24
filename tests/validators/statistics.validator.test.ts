import { describe, it, expect } from 'vitest';
import { statisticsQueryValidators } from '@/validators/statistics.validator';
import { validationResult } from 'express-validator';

async function runStatisticsValidation(query: Record<string, unknown>) {
  const req = { query } as any;
  const res = {} as any;
  const next = () => {};
  for (const validator of statisticsQueryValidators) {
    await validator(req, res, next);
  }
  return validationResult(req);
}

describe('statisticsQueryValidators', () => {
  it('passes when no query params are provided (both optional)', async () => {
    const result = await runStatisticsValidation({});
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for valid since date in past', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const d = String(yesterday.getDate()).padStart(2, '0');
    const result = await runStatisticsValidation({ since: `${y}-${m}-${d}` });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails when since date has invalid format', async () => {
    const result = await runStatisticsValidation({ since: '2026/07/22' });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('since must be in yyyy-mm-dd format'))).toBe(true);
  });

  it('fails when since date is invalid', async () => {
    const result = await runStatisticsValidation({ since: 'not-a-date' });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when since date is today', async () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const result = await runStatisticsValidation({ since: `${y}-${m}-${d}` });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('since date must be in the past'))).toBe(true);
  });

  it('fails when since date is in the future', async () => {
    const result = await runStatisticsValidation({ since: '2099-01-01' });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('since date must be in the past'))).toBe(true);
  });

  it('passes for valid positive amount', async () => {
    const result = await runStatisticsValidation({ amount: '5' });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails when amount is not a positive integer', async () => {
    const result = await runStatisticsValidation({ amount: '0' });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e) => e.msg.includes('amount must be a positive integer'))).toBe(true);
  });

  it('fails when amount is negative', async () => {
    const result = await runStatisticsValidation({ amount: '-1' });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when amount is not a number', async () => {
    const result = await runStatisticsValidation({ amount: 'abc' });
    expect(result.isEmpty()).toBe(false);
  });

  it('passes with both valid since and amount', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const d = String(yesterday.getDate()).padStart(2, '0');
    const result = await runStatisticsValidation({ since: `${y}-${m}-${d}`, amount: '10' });
    expect(result.isEmpty()).toBe(true);
  });
});
