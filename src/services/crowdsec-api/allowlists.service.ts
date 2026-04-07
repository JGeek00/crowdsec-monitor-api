import { CrowdSecAllowlist, CrowdSecAllowlistCheckResponse } from '@/types/crowdsec.types';
import { CrowdSecBaseClient } from './base-client.service';

export class AllowlistsService {
  constructor(private readonly base: CrowdSecBaseClient) {}

  /**
   * Get all allowlists from CrowdSec LAPI
   */
  async getAllowlists(): Promise<CrowdSecAllowlist[]> {
    try {
      const headers = await this.base.getAuthHeaders();
      const response = await this.base.client.get('/v1/allowlists', {
        params: { with_content: 'true' },
        headers,
      });
      return response.data || [];
    } catch (error) {
      this.base.handleError(error, 'fetching allowlists');
      return [];
    }
  }

  /**
   * Get a specific allowlist by name from CrowdSec LAPI
   * @param allowlist_name - The name of the allowlist
   * @returns The allowlist or null if not found
   */
  async getAllowlistByName(allowlist_name: string): Promise<CrowdSecAllowlist | null> {
    try {
      const allowlists = await this.getAllowlists();
      return allowlists.find(a => a.name === allowlist_name) || null;
    } catch (error) {
      this.base.handleError(error, `fetching allowlist ${allowlist_name}`);
      return null;
    }
  }

  /**
   * Check if IPs are in any allowlist
   * @param ips - Array of IP addresses to check
   * @returns Array with IP and allowlist name (or null if not in any allowlist)
   */
  async checkAllowlist(ips: string[]): Promise<Array<{ ip: string; allowlist: string | null }>> {
    try {
      const headers = await this.base.getAuthHeaders();
      const response = await this.base.client.post<CrowdSecAllowlistCheckResponse>(
        '/v1/allowlists/check',
        { targets: ips },
        { headers },
      );

      const ipAllowlistMap = new Map<string, string>();

      if (response.data && response.data.results) {
        for (const result of response.data.results) {
          if (result.allowlists && result.allowlists.length > 0) {
            const allowlistString = result.allowlists[0];
            const match = allowlistString.match(/from\s+(\S+)/);
            if (match && match[1]) {
              ipAllowlistMap.set(result.target, match[1]);
            }
          }
        }
      }

      return ips.map(ip => ({
        ip,
        allowlist: ipAllowlistMap.get(ip) || null,
      }));
    } catch (error) {
      this.base.handleError(error, 'checking allowlists');
      return ips.map(ip => ({ ip, allowlist: null }));
    }
  }
}
