import { describe, it, expect } from 'vitest';
import { escapeLike } from '@/utils/sql';

describe('escapeLike', () => {
  it('escapes percent signs', () => {
    expect(escapeLike('100%')).toBe('100\\%');
  });

  it('escapes underscores', () => {
    expect(escapeLike('hello_world')).toBe('hello\\_world');
  });

  it('escapes backslashes', () => {
    expect(escapeLike('test\\path')).toBe('test\\\\path');
  });

  it('escapes mixed wildcards', () => {
    expect(escapeLike('a%b_c')).toBe('a\\%b\\_c');
  });

  it('returns normal strings unchanged', () => {
    expect(escapeLike('hello')).toBe('hello');
    expect(escapeLike('test123')).toBe('test123');
  });

  it('handles empty string', () => {
    expect(escapeLike('')).toBe('');
  });

  it('handles strings with only wildcards', () => {
    expect(escapeLike('%_%')).toBe('\\%\\_\\%');
  });
});
