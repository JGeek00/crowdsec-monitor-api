import { describe, it, expect } from 'vitest';
import { matchOperator, evaluateCondition, isValidCondition, type AlertLike } from '@/domain/value-objects/notification-condition';

describe('matchOperator', () => {
  const alert: AlertLike = { scenario: 'crowdsec/ssh-bf' };

  it('equals matches any candidate case-insensitively', () => {
    expect(matchOperator('crowdsec/ssh-bf', 'equals', 'CROWDSEC/SSH-BF')).toBe(true);
    expect(matchOperator('ssh-bf', 'equals', ['a', 'b'])).toBe(false);
  });

  it('not_equals requires every candidate to differ', () => {
    expect(matchOperator('ssh-bf', 'not_equals', ['a', 'b'])).toBe(true);
    expect(matchOperator('ssh-bf', 'not_equals', ['ssh-bf', 'b'])).toBe(false);
  });

  it('in matches membership and not_in its negation', () => {
    expect(matchOperator('ssh-bf', 'in', ['a', 'ssh-bf'])).toBe(true);
    expect(matchOperator('ssh-bf', 'in', ['a'])).toBe(false);
    expect(matchOperator('ssh-bf', 'not_in', ['a'])).toBe(true);
    expect(matchOperator('ssh-bf', 'not_in', ['ssh-bf'])).toBe(false);
  });

  it('contains ignores empty candidates', () => {
    expect(matchOperator('crowdsec/ssh-bf', 'contains', ['ssh'])).toBe(true);
    expect(matchOperator('crowdsec/ssh-bf', 'contains', [''])).toBe(false);
    expect(matchOperator('crowdsec/ssh-bf', 'contains', ['nginx'])).toBe(false);
  });

  it('returns false for an unknown operator', () => {
    expect(matchOperator('ssh-bf', 'unknown' as never, 'ssh-bf')).toBe(false);
  });
});

describe('evaluateCondition field resolution', () => {
  const alert = {
    scenario: 'ssh-bf',
    origin: 'crowdsec',
    alertType: 'ban',
    source: { cn: 'US', value: 'evil.com', ip: '1.2.3.4', scope: 'Ip', as_name: 'EXAMPLE-AS' },
  };

  it('reads every supported field', () => {
    const leaf = (field: string, value: string) => ({ type: 'leaf', field, operator: 'equals', value });
    for (const [field, value] of [
      ['scenario', 'ssh-bf'],
      ['country', 'US'],
      ['origin', 'crowdsec'],
      ['type', 'ban'],
      ['scope', 'Ip'],
      ['ipOwner', 'EXAMPLE-AS'],
    ]) {
      expect(evaluateCondition(alert, leaf(field, value) as never)).toBe(true);
    }
    // target prefers source.value over source.ip
    expect(evaluateCondition(alert, leaf('target', 'evil.com') as never)).toBe(true);
    expect(evaluateCondition(alert, leaf('target', '1.2.3.4') as never)).toBe(false);
  });

  it('falls back to empty string for missing fields', () => {
    expect(evaluateCondition({ scenario: 's' }, { type: 'leaf', field: 'origin', operator: 'equals', value: '' })).toBe(true);
    expect(evaluateCondition({}, { type: 'leaf', field: 'country', operator: 'equals', value: 'US' })).toBe(false);
  });

  it('combines and/or/not nodes including empty groups', () => {
    const leaf = { type: 'leaf', field: 'scenario', operator: 'equals', value: 'ssh-bf' };
    expect(evaluateCondition(alert, { type: 'and', children: [leaf] })).toBe(true);
    expect(evaluateCondition(alert, { type: 'and', children: [] })).toBe(true); // vacuous truth
    expect(evaluateCondition(alert, { type: 'or', children: [leaf, { ...leaf, value: 'x' }] })).toBe(true);
    expect(evaluateCondition(alert, { type: 'or', children: [] })).toBe(false); // empty or matches none
    expect(evaluateCondition(alert, { type: 'not', child: leaf })).toBe(false);
    expect(evaluateCondition(alert, { type: 'wat' } as never)).toBe(false);
  });
});

describe('isValidCondition', () => {
  it('rejects non-object nodes and unknown fields/operators', () => {
    expect(isValidCondition(null)).toBe(false);
    expect(isValidCondition('leaf')).toBe(false);
    expect(isValidCondition({ type: 'leaf', field: 'nope', operator: 'equals', value: 'x' })).toBe(false);
    expect(isValidCondition({ type: 'leaf', field: 'scenario', operator: 'nope', value: 'x' })).toBe(false);
  });

  it('validates structural shape (array, ≤20 children) but not each child', () => {
    expect(isValidCondition({ type: 'and', children: 'nope' })).toBe(false);
    expect(isValidCondition({ type: 'and', children: [null] })).toBe(true); // shape-only validation
    expect(isValidCondition({ type: 'or', children: [] })).toBe(true);
    expect(isValidCondition({ type: 'not', child: { type: 'leaf', field: 'scenario', operator: 'equals', value: 'x' } })).toBe(true);
  });

  it('validates leaf value type and bounds', () => {
    const leaf = (value: unknown) => ({ type: 'leaf', field: 'scenario', operator: 'equals', value });
    expect(isValidCondition(leaf(''))).toBe(false); // empty string
    expect(isValidCondition(leaf('x'.repeat(501)))).toBe(false); // too long
    expect(isValidCondition(leaf('x'.repeat(500)))).toBe(true);
    expect(isValidCondition(leaf([]))).toBe(false); // empty array
    expect(isValidCondition(leaf(['a', '']))).toBe(false); // empty array member
    expect(isValidCondition(leaf(['a', 'b']))).toBe(true);
    expect(isValidCondition(leaf(Array(51).fill('a')))).toBe(false); // too many
    expect(isValidCondition(leaf(42))).toBe(false); // non-string value
  });

  it('accepts valid leaves and nested structures', () => {
    expect(isValidCondition({ type: 'leaf', field: 'scenario', operator: 'equals', value: 'x' })).toBe(true);
    expect(
      isValidCondition({
        type: 'and',
        children: [
          { type: 'leaf', field: 'country', operator: 'in', value: ['US'] },
          { type: 'not', child: { type: 'leaf', field: 'origin', operator: 'contains', value: 'cs' } },
        ],
      }),
    ).toBe(true);
  });
});
