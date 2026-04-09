import { CrowdSecBaseClient } from './base-client.service';
import { AlertsService } from './alerts.service';
import { DecisionsService } from './decisions.service';
import { AllowlistsService } from './allowlists.service';

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
}

export const crowdSecAPI = new CrowdSecAPIService();
