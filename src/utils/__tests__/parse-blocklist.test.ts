import { describe, it, expect } from 'vitest';
import { parseBlocklistContent } from '@/utils/parse-blocklist';

describe('parseBlocklistContent', () => {
  it('parses simple IP entries', () => {
    const result = parseBlocklistContent('1.2.3.4\n5.6.7.8\n10.0.0.0/24');
    expect(result).toEqual(['1.2.3.4', '5.6.7.8', '10.0.0.0/24']);
  });

  it('strips full-line comments', () => {
    const content = '# This is a comment\n1.2.3.4\n; Another comment\n5.6.7.8\n// Yet another\n9.9.9.9';
    const result = parseBlocklistContent(content);
    expect(result).toEqual(['1.2.3.4', '5.6.7.8', '9.9.9.9']);
  });

  it('strips inline comments', () => {
    const content = '1.2.3.4  # after IP\n5.6.7.8 ; comment';
    const result = parseBlocklistContent(content);
    expect(result).toEqual(['1.2.3.4', '5.6.7.8']);
  });

  it('skips blank and whitespace-only lines', () => {
    const content = '1.2.3.4\n\n   \n5.6.7.8\n\t\n10.0.0.0/24';
    const result = parseBlocklistContent(content);
    expect(result).toEqual(['1.2.3.4', '5.6.7.8', '10.0.0.0/24']);
  });

  it('handles mixed IPv4, IPv4 CIDR, IPv6, IPv6 CIDR', () => {
    const content = '1.2.3.4\n10.0.0.0/8\n::1\n2001:db8::/32';
    const result = parseBlocklistContent(content);
    expect(result).toEqual(['1.2.3.4', '10.0.0.0/8', '::1', '2001:db8::/32']);
  });

  it('deduplicates is not done by default - preserves as many entries as match', () => {
    const content = '1.2.3.4\n1.2.3.4';
    const result = parseBlocklistContent(content);
    expect(result).toEqual(['1.2.3.4', '1.2.3.4']);
  });

  it('filters out invalid entries', () => {
    const content = '1.2.3.4\nnot-an-ip\n256.256.256.256\n999.999.999.999';
    const result = parseBlocklistContent(content);
    expect(result).toEqual(['1.2.3.4']);
  });

  it('returns empty array for empty content', () => {
    expect(parseBlocklistContent('')).toEqual([]);
  });

  it('returns empty array for content with only comments', () => {
    expect(parseBlocklistContent('# just a comment')).toEqual([]);
  });
});
