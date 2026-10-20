/**
 * IpAddress value object: thin typed wrapper over the pure IP helpers.
 * Re-exports the pure functions so domain/application code depends on the VO,
 * not on the legacy util location.
 */
export { isIpv4, ipToInt32, isIpv4InCidr, isIpv6InCidr, buildAllowlistMatcher } from '@/shared/utils/ip';
