import { describe, expect, it } from 'vitest';
import { evaluateCondition, isValidCondition, matchOperator } from '@/utils/notification-condition';

const baseAlert = {
  scenario: 'crowdsecurity/http-probing',
  source: { ip: '1.2.3.4', value: '1.2.3.4', scope: 'Ip', cn: 'ES' },
  origin: 'crowdsec',
  alertType: 'ban',
};

describe('matchOperator', () => {
  it('matches equals case-insensitively', () => {
    expect(matchOperator('ES', 'equals', 'es')).toBe(true);
    expect(matchOperator('ES', 'equals', 'FR')).toBe(false);
  });

  it('matches in / not_in', () => {
    expect(matchOperator('es', 'in', ['ES', 'FR'])).toBe(true);
    expect(matchOperator('DE', 'not_in', ['ES', 'FR'])).toBe(true);
  });

  it('matches contains', () => {
    expect(matchOperator('crowdsecurity/http-probing', 'contains', 'http')).toBe(true);
  });
});

describe('evaluateCondition', () => {
  it('evaluates the example from the spec', () => {
    const condition = {
      type: 'and',
      children: [
        {
          type: 'or',
          children: [
            { type: 'leaf', field: 'scenario', operator: 'equals', value: 'crowdsecurity/http-probing' },
            { type: 'leaf', field: 'scenario', operator: 'equals', value: 'crowdsecurity/ssh-bf' },
          ],
        },
        { type: 'leaf', field: 'country', operator: 'equals', value: 'ES' },
      ],
    } as const;
    expect(evaluateCondition(baseAlert, condition)).toBe(true);
    expect(
      evaluateCondition({ ...baseAlert, source: { ...baseAlert.source, cn: 'FR' } }, condition),
    ).toBe(false);
  });

  it('supports not nodes', () => {
    expect(
      evaluateCondition(baseAlert, {
        type: 'not',
        child: { type: 'leaf', field: 'country', operator: 'equals', value: 'FR' },
      }),
    ).toBe(true);
  });

  it('reads every field (target, origin, type, scope)', () => {
    expect(
      evaluateCondition(baseAlert, { type: 'leaf', field: 'target', operator: 'equals', value: '1.2.3.4' }),
    ).toBe(true);
    expect(evaluateCondition(baseAlert, { type: 'leaf', field: 'origin', operator: 'equals', value: 'crowdsec' })).toBe(
      true,
    );
    expect(evaluateCondition(baseAlert, { type: 'leaf', field: 'type', operator: 'equals', value: 'ban' })).toBe(true);
    expect(evaluateCondition(baseAlert, { type: 'leaf', field: 'scope', operator: 'equals', value: 'ip' })).toBe(true);
    expect(
      evaluateCondition(
        { ...baseAlert, source: { ...baseAlert.source, as_name: 'EXAMPLE-AS' } },
        { type: 'leaf', field: 'ipOwner', operator: 'equals', value: 'example-as' },
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { scenario: 'x', source: { ip: '9.9.9.9', value: '', scope: '' } },
        { type: 'leaf', field: 'target', operator: 'contains', value: '9.9' },
      ),
    ).toBe(true);
  });

  it('covers all operators including negatives', () => {
    expect(matchOperator('ES', 'not_equals', 'FR')).toBe(true);
    expect(matchOperator('ES', 'not_equals', 'es')).toBe(false);
    expect(matchOperator('ES', 'in', ['es'])).toBe(true);
    expect(matchOperator('ES', 'not_in', ['fr'])).toBe(true);
    expect(matchOperator('ES', 'not_in', ['es'])).toBe(false);
    expect(matchOperator('abc', 'contains', '')).toBe(false);
    expect(matchOperator('abc', 'contains', ['x', 'b'])).toBe(true);
    expect(matchOperator('abc', 'equals', ['x', 'abc'])).toBe(true);
  });
});

describe('empty and matches everything', () => {
  it('matches any alert and passes validation', () => {
    expect(evaluateCondition(baseAlert, { type: 'and', children: [] })).toBe(true);
    expect(evaluateCondition(baseAlert, { type: 'or', children: [] })).toBe(false);
    expect(isValidCondition({ type: 'and', children: [] })).toBe(true);
  });
});

describe('isValidCondition', () => {
  it('accepts valid leaves and composites', () => {
    expect(isValidCondition({ type: 'leaf', field: 'scenario', operator: 'equals', value: 'x' })).toBe(true);
    expect(isValidCondition({ type: 'leaf', field: 'country', operator: 'in', value: ['ES', 'FR'] })).toBe(true);
    expect(isValidCondition({ type: 'leaf', field: 'ipOwner', operator: 'contains', value: 'amazon' })).toBe(true);
    expect(
      isValidCondition({ type: 'and', children: [{ type: 'leaf', field: 'scenario', operator: 'equals', value: 'x' }] }),
    ).toBe(true);
    expect(
      isValidCondition({
        type: 'not',
        child: { type: 'leaf', field: 'scenario', operator: 'equals', value: 'x' },
      }),
    ).toBe(true);
  });

  it('rejects malformed shapes', () => {
    expect(isValidCondition(null)).toBe(false);
    expect(isValidCondition('x')).toBe(false);
    expect(isValidCondition({ type: 'nope' })).toBe(false);
    expect(isValidCondition({ type: 'leaf', field: 'nope', operator: 'equals', value: 'x' })).toBe(false);
    expect(isValidCondition({ type: 'leaf', field: 'scenario', operator: 'nope', value: 'x' })).toBe(false);
    expect(isValidCondition({ type: 'leaf', field: 'scenario', operator: 'equals', value: '' })).toBe(false);
    expect(isValidCondition({ type: 'leaf', field: 'scenario', operator: 'equals', value: 42 })).toBe(false);
    expect(isValidCondition({ type: 'leaf', field: 'scenario', operator: 'in', value: [] })).toBe(false);
    expect(isValidCondition({ type: 'leaf', field: 'scenario', operator: 'in', value: [42] })).toBe(false);
    expect(isValidCondition({ type: 'or', children: Array.from({ length: 21 }, () => ({ type: 'leaf' })) })).toBe(false);
    expect(
      isValidCondition({ type: 'and', children: Array.from({ length: 21 }, () => ({ type: 'leaf' })) }),
    ).toBe(false);
    expect(isValidCondition({ type: 'not', child: null })).toBe(false);
    expect(isValidCondition({ type: 'not' })).toBe(false);
  });
});
