import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '@/config';
import { CrowdSecLoginResponse } from '@/types/crowdsec.types';
import { BLOCKLIST_SCENARIO_PREFIX, MANUAL_DECISION } from '@/constants/scenarios';

export class CrowdSecBaseClient {
  readonly client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiration: Date | null = null;
  private loginPromise: Promise<boolean> | null = null;
  private bouncerConnected: boolean = false;

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
        scenarios: [MANUAL_DECISION, BLOCKLIST_SCENARIO_PREFIX],
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
  isTokenValid(): boolean {
    if (!this.token || !this.tokenExpiration) {
      return false;
    }

    // Check if token expires in less than 5 minutes
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    return this.tokenExpiration > fiveMinutesFromNow;
  }

  /**
   * Ensure we have a valid token, login if necessary.
   * Uses a shared promise so concurrent callers don't each trigger a separate login.
   */
  async ensureAuthenticated(): Promise<boolean> {
    if (this.isTokenValid()) {
      return true;
    }

    if (this.loginPromise) {
      return await this.loginPromise;
    }

    console.log('Token expired or not available, re-authenticating...');
    this.loginPromise = this.login().finally(() => {
      this.loginPromise = null;
    });
    return await this.loginPromise;
  }

  /**
   * Get authorization headers with Bearer token
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    await this.ensureAuthenticated();

    if (!this.token) {
      throw new Error('Authentication failed: No token available');
    }

    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * Test connection to CrowdSec LAPI
   */
  async testConnection(): Promise<boolean> {
    try {
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        return false;
      }

      const headers = await this.getAuthHeaders();
      await this.client.get('/v1/alerts', { headers });
      return true;
    } catch (error) {
      console.error('CrowdSec LAPI connection test failed:', error);
      return false;
    }
  }

  /**
   * Quick status check - verifies LAPI is reachable without re-authenticating
   * Uses existing token if valid, makes minimal request with since=1m
   */
  async checkStatus(): Promise<boolean> {
    try {
      if (!this.isTokenValid()) {
        const authenticated = await this.ensureAuthenticated();
        if (!authenticated) {
          return false;
        }
      }

      await this.client.get('/v1/alerts?since=1m&scope=Ip&scope=Range', {
        headers: { Authorization: `Bearer ${this.token}` },
        timeout: 3000,
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if the bouncer API key (CROWDSEC_BOUNCER_KEY) is valid and CrowdSec is reachable.
   */
  async checkBouncerConnection(): Promise<void> {
    try {
      await this.client.get('/v1/decisions', {
        headers: { 'X-Api-Key': config.crowdsec.bouncerKey },
      });
      this.bouncerConnected = true;
      console.log('✓ CrowdSec bouncer API key validated successfully');
    } catch (error) {
      this.bouncerConnected = false;
      if (axios.isAxiosError(error) && error.response) {
        console.error(`✗ CrowdSec bouncer API key validation failed: HTTP ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        console.error('✗ CrowdSec bouncer API key validation failed: Unable to reach CrowdSec LAPI');
      }
    }
  }

  /**
   * Returns whether the bouncer API key check on startup was successful.
   */
  isBouncerConnected(): boolean {
    return this.bouncerConnected;
  }

  /**
   * Update the bouncer connected status.
   */
  setBouncerConnected(value: boolean): void {
    this.bouncerConnected = value;
  }

  /**
   * Handle API errors
   */
  handleError(error: unknown, action: string): void {
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
