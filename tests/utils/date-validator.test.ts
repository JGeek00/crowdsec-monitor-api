import { describe, it, expect } from 'vitest';
import { isValidDate } from '@/utils/date-validator';

describe('isValidDate', () => {
  it('returns true for valid ISO date strings', () => {
    expect(isValidDate('2026-07-23T00:00:00.000Z')).toBe(true);
    expect(isValidDate('2026-01-01T12:00:00.000Z')).toBe(true);
    expect(isValidDate('2025-12-31T23:59:59.999Z')).toBe(true);
  });

  it('returns false for null or empty input', () => {
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate('')).toBe(false);
  });

  it('returns false for the year 0001 (invalid default)', () => {
    expect(isValidDate('0001-01-01T00:00:00.000Z')).toBe(false);
  });

  it('returns false for the year 1000 (invalid default)', () => {
    expect(isValidDate('1000-01-01T00:00:00.000Z')).toBe(false);
  });

  it('returns false for completely invalid date strings', () => {
    expect(isValidDate('not-a-date')).toBe(false);
    expect(isValidDate('abc-def-gh')).toBe(false);
  });

  it('returns true for date-only format', () => {
    expect(isValidDate('2026-07-23')).toBe(true);
  });

  it('returns false for NaN date', () => {
    expect(isValidDate('undefined')).toBe(false);
  });
});
