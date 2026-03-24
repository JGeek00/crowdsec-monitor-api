import { Resolver } from 'dns/promises';

/**
 * Resolve a domain to its IPv4 and IPv6 addresses using the given DNS server.
 */
export async function resolveIps(domain: string, server: string): Promise<string[]> {
  const resolver = new Resolver();
  resolver.setServers([server]);

  const [ipv4Result, ipv6Result] = await Promise.allSettled([
    resolver.resolve4(domain),
    resolver.resolve6(domain),
  ]);

  return [
    ...(ipv4Result.status === 'fulfilled' ? ipv4Result.value : []),
    ...(ipv6Result.status === 'fulfilled' ? ipv6Result.value : []),
  ].filter(ip => ip !== '' && ip !== null);
}
