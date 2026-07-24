import type { CrowdSecLoginResponse } from '@/types/crowdsec.types';
import type { Alert, UnparsedMetaData, Decision } from '@/models';
import type { CrowdSecAllowlist } from '@/types/crowdsec.types';

export interface LapiMockState {
  alerts: Alert<UnparsedMetaData>[];
  decisions: Decision[];
  allowlists: CrowdSecAllowlist[];
  loginResponse: CrowdSecLoginResponse | null;
  error: 'timeout' | '401' | '500' | null;
}

export interface LapiMock {
  getState: () => LapiMockState;
  setAlerts: (alerts: Alert<UnparsedMetaData>[]) => void;
  setDecisions: (decisions: Decision[]) => void;
  setAllowlists: (allowlists: CrowdSecAllowlist[]) => void;
  setLoginResponse: (response: CrowdSecLoginResponse | null) => void;
  setError: (error: 'timeout' | '401' | '500' | null) => void;
  reset: () => void;
}

const defaultState = (): LapiMockState => ({
  alerts: [],
  decisions: [],
  allowlists: [],
  loginResponse: { code: 200, expire: new Date(Date.now() + 3600000).toISOString(), token: 'mock-token' },
  error: null,
});

export function createLapiMock(): LapiMock {
  const state = defaultState();

  return {
    getState: () => state,
    setAlerts: (alerts) => {
      state.alerts = alerts;
    },
    setDecisions: (decisions) => {
      state.decisions = decisions;
    },
    setAllowlists: (allowlists) => {
      state.allowlists = allowlists;
    },
    setLoginResponse: (response) => {
      state.loginResponse = response;
    },
    setError: (error) => {
      state.error = error;
    },
    reset: () => {
      const fresh = defaultState();
      Object.assign(state, fresh);
    },
  };
}
