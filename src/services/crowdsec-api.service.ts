import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';
import { CrowdSecAlert, CrowdSecDecision, CrowdSecLoginResponse } from '../types/crowdsec.types';

export class CrowdSecAPIService {
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiration: Date | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: config.crowdsec.lapiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Login to CrowdSec LAPI and get authentication token
   */
  async login(): Promise<boolean> {
    try {
      console.log('Authenticating with CrowdSec LAPI...');
      
      const response = await this.client.post<CrowdSecLoginResponse>('/v1/watchers/login', {
        machine_id: config.crowdsec.user,
        password: config.crowdsec.password,
        scenarios: ['manual/crowdsec-monitor'],
      });

      if (response.data && response.data.token) {
        this.token = response.data.token;
        this.tokenExpiration = new Date(response.data.expire);
        console.log(`✓ Authentication successful. Token expires at: ${this.tokenExpiration.toISOString()}`);
        return true;
      }

      console.error('✗ Authentication failed: No token received');
      return false;
    } catch (error) {
      this.handleError(error, 'authenticating');
      return false;
    }
  }

  /**
   * Check if token is valid and not expired
   */
  private isTokenValid(): boolean {
    if (!this.token || !this.tokenExpiration) {
      return false;
    }

    // Check if token expires in less than 5 minutes
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    return this.tokenExpiration > fiveMinutesFromNow;
  }

  /**
   * Ensure we have a valid token, login if necessary
   */
  private async ensureAuthenticated(): Promise<boolean> {
    if (this.isTokenValid()) {
      return true;
    }

    console.log('Token expired or not available, re-authenticating...');
    return await this.login();
  }

  /**
   * Get authorization headers with Bearer token
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    await this.ensureAuthenticated();
    
    if (!this.token) {
      throw new Error('Authentication failed: No token available');
    }

    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * Get all alerts from CrowdSec LAPI
   * @param params - Query parameters
   * @param params.since - Duration string (e.g., '1h', '30s')
   * @param params.until - Duration string (e.g., '1h', '30s')
   * @param params.has_active_decision - Filter alerts with active decisions
   */
  async getAlerts(params?: { 
    since?: string; 
    until?: string; 
    has_active_decision?: boolean;
  }): Promise<CrowdSecAlert[]> {
    // Exclude CAPI alerts by default because they are huge (scope: 'Ip' or 'Range')
    const scopes = ['Ip', 'Range'];

    try {
      const headers = await this.getAuthHeaders();

      const queryParams = new URLSearchParams();
      scopes.forEach(s => queryParams.append('scope', s));
      if (params?.since) queryParams.append('since', params.since);
      if (params?.until) queryParams.append('until', params.until);
      if (params?.has_active_decision !== undefined) {
        queryParams.append('has_active_decision', String(params.has_active_decision));
      }

      const response = await this.client.get('/v1/alerts', { params: queryParams, headers });
      return response.data || [];
    } catch (error) {
      this.handleError(error, 'fetching alerts');
      return [];
    }
  }

  /**
   * Get a specific alert by ID
   */
  async getAlertById(id: number): Promise<CrowdSecAlert | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.client.get(`/v1/alerts/${id}`, { headers });
      return response.data;
    } catch (error) {
      this.handleError(error, `fetching alert ${id}`);
      return null;
    }
  }

  /**
   * Get decisions from alerts
   * Note: CrowdSec LAPI doesn't have a dedicated decisions endpoint.
   * Decisions are included in the alerts data.
   */
  async getDecisionsFromAlerts(params?: { 
    since?: string; 
    until?: string;
  }): Promise<CrowdSecDecision[]> {
    try {
      // Get alerts with active decisions
      const alerts = await this.getAlerts({ 
        ...params, 
        has_active_decision: true 
      });
      
      // Extract decisions from alerts
      const decisions: CrowdSecDecision[] = [];
      for (const alert of alerts) {
        if (alert.decisions && Array.isArray(alert.decisions)) {
          decisions.push(...alert.decisions);
        }
      }
      
      return decisions;
    } catch (error) {
      this.handleError(error, 'fetching decisions from alerts');
      return [];
    }
  }

  /**
   * Test connection to CrowdSec LAPI
   */
  async testConnection(): Promise<boolean> {
    try {
      // First, try to login
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        return false;
      }

      // Then test with a simple query (get recent alerts)
      const headers = await this.getAuthHeaders();
      await this.client.get('/v1/alerts', { headers });
      return true;
    } catch (error) {
      console.error('CrowdSec LAPI connection test failed:', error);
      return false;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown, action: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error(`Error ${action}: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      } else if (axiosError.request) {
        console.error(`No response received when ${action}`);
      } else {
        console.error(`Error setting up request when ${action}: ${axiosError.message}`);
      }
    } else {
      console.error(`Unexpected error when ${action}:`, error);
    }
  }
}

export const crowdSecAPI = new CrowdSecAPIService();
