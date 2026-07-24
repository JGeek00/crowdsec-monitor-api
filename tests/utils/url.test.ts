import { describe, it, expect } from 'vitest';
import { assertSafeUrl } from '@/utils/url';

describe('assertSafeUrl', () => {
  it('accepts valid public http URLs', () => {
    expect(() => assertSafeUrl('http://example.com')).not.toThrow();
    expect(() => assertSafeUrl('https://example.com')).not.toThrow();
  });

  it('throws for invalid URL format', () => {
    expect(() => assertSafeUrl('not-a-url')).toThrow('Invalid URL format');
    expect(() => assertSafeUrl('')).toThrow('Invalid URL format');
  });

  it('throws for non-http/https schemes', () => {
    expect(() => assertSafeUrl('ftp://example.com')).toThrow('Only http and https schemes are allowed');
    expect(() => assertSafeUrl('file:///etc/passwd')).toThrow('Only http and https schemes are allowed');
  });

  it('throws for localhost', () => {
    expect(() => assertSafeUrl('http://localhost')).toThrow('points to a private or reserved hostname');
    expect(() => assertSafeUrl('http://localhost:3000')).toThrow('points to a private or reserved hostname');
  });

  it('throws for private hostnames', () => {
    expect(() => assertSafeUrl('http://myservice.local')).toThrow('points to a private or reserved hostname');
    expect(() => assertSafeUrl('http://internal.localhost')).toThrow('points to a private or reserved hostname');
  });

  it('throws for private IP addresses', () => {
    expect(() => assertSafeUrl('http://127.0.0.1')).toThrow('private or reserved IP');
    expect(() => assertSafeUrl('http://10.0.0.1')).toThrow('private or reserved IP');
    expect(() => assertSafeUrl('http://192.168.1.1')).toThrow('private or reserved IP');
    expect(() => assertSafeUrl('http://172.16.0.1')).toThrow('private or reserved IP');
  });

  it('throws for link-local and reserved IPs', () => {
    expect(() => assertSafeUrl('http://169.254.1.1')).toThrow('private or reserved IP');
    expect(() => assertSafeUrl('http://0.0.0.1')).toThrow('private or reserved IP');
    expect(() => assertSafeUrl('http://100.64.0.1')).toThrow('private or reserved IP');
  });

  it('accepts public IP addresses', () => {
    expect(() => assertSafeUrl('http://8.8.8.8')).not.toThrow();
    expect(() => assertSafeUrl('http://1.1.1.1')).not.toThrow();
    expect(() => assertSafeUrl('http://203.0.113.1')).not.toThrow();
  });
});
