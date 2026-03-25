import { ipToInt32 } from './ip';

const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ['127.0.0.0', 8],    // loopback
  ['10.0.0.0', 8],     // private
  ['172.16.0.0', 12],  // private
  ['192.168.0.0', 16], // private
  ['169.254.0.0', 16], // link-local
  ['0.0.0.0', 8],      // reserved
  ['100.64.0.0', 10],  // shared address (CGN)
];

const IPV4_LITERAL = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * Asserts that a URL is a valid, publicly routable http/https address.
 * Throws an Error if the URL uses a disallowed scheme, points to a private
 * or reserved hostname, or resolves to a private IPv4 range — preventing SSRF.
 */
export function assertSafeUrl(raw: string): void {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https schemes are allowed');
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  const lower = hostname.toLowerCase();

  if (
    lower === 'localhost' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.localhost')
  ) {
    throw new Error('URL points to a private or reserved hostname');
  }

  if (IPV4_LITERAL.test(hostname)) {
    const ip32 = ipToInt32(hostname);
    for (const [rangeIp, prefix] of PRIVATE_IPV4_RANGES) {
      const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
      if ((ip32 & mask) === (ipToInt32(rangeIp) & mask)) {
        throw new Error('URL points to a private or reserved IP address');
      }
    }
  }
}
