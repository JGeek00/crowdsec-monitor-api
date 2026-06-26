import { ipv4Regex, ipv4CidrRegex, ipv6Regex, ipv6CidrRegex } from '@/constants/regexps';

/**
 * Parses raw blocklist content into an array of valid IP/CIDR entries.
 *
 * Handles:
 *  - Full-line comments starting with '#'
 *  - Inline comments after the IP (e.g. "12.42.182.4  # Comment")
 *  - Blank / whitespace-only lines
 *  - IPv4, IPv4 CIDR, IPv6, IPv6 CIDR
 *
 * @param content - Raw text content of a blocklist file
 * @returns Array of validated IP or CIDR strings
 */
export function parseBlocklistContent(content: string): string[] {
  return content
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0 && !line.startsWith('#'))
    .map((line: string) => {
      const commentIndex = line.indexOf('#');
      if (commentIndex !== -1) {
        return line.slice(0, commentIndex).trim();
      }
      return line;
    })
    .filter((entry: string) => entry.length > 0)
    .filter(
      (entry: string) =>
        ipv4Regex.test(entry) || ipv4CidrRegex.test(entry) || ipv6Regex.test(entry) || ipv6CidrRegex.test(entry),
    );
}
