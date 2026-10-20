import { CrowdSecBaseClient } from './base-client';
import { AlertsService } from './alerts';
import { DecisionsService } from './decisions';
import { AllowlistsService } from './allowlists';

export class CrowdSecAPIService {
  readonly alerts: AlertsService;
  readonly decisions: DecisionsService;
  readonly allowlists: AllowlistsService;
  private readonly base: CrowdSecBaseClient;

  constructor() {
    this.base = new CrowdSecBaseClient();
    this.alerts = new AlertsService(this.base);
    this.decisions = new DecisionsService(this.base, this.alerts);
    this.allowlists = new AllowlistsService(this.base);
  }

  login() {
    return this.base.login();
  }

  testConnection() {
    return this.base.testConnection();
  }

  checkStatus() {
    return this.base.checkStatus();
  }

  checkBouncerConnection() {
    return this.base.checkBouncerConnection();
  }

  isBouncerConnected() {
    return this.base.isBouncerConnected();
  }

  setBouncerConnected(value: boolean) {
    this.base.setBouncerConnected(value);
  }

  getLastLapiConnected() {
    return this.base.getLastLapiConnected();
  }
}

export const crowdSecAPI = new CrowdSecAPIService();
