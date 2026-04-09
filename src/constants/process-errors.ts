// Shared strings used by more than one process operation
const FETCH_FAILED = 'Failed to fetch the blocklist content from the remote URL';
const CROWDSEC_DECISIONS_FAILED = 'Failed to retrieve active decisions from CrowdSec. This can be caused by an invalid bouncer API key. Check the CROWDSEC_BOUNCER_KEY configuration and ensure CrowdSec LAPI is accessible.';
const DB_WRITE_FAILED = 'Failed to save IPs to the local database';
const CROWDSEC_PUSH_FAILED = 'Failed to push IP decisions to CrowdSec';
const CROWDSEC_ALERTS_FETCH_FAILED = 'Failed to retrieve blocklist alerts from CrowdSec';
const CROWDSEC_ALERT_DELETE_FAILED = 'Failed to delete blocklist decisions from CrowdSec';
const DB_CLEANUP_FAILED = 'Failed to remove IPs from the local database';

export const PROCESS_ERRORS = {
  blocklistImport: {
    fetchFailed: FETCH_FAILED,
    crowdSecDecisionsFailed: CROWDSEC_DECISIONS_FAILED,
    dbWriteFailed: DB_WRITE_FAILED,
    crowdSecPushFailed: CROWDSEC_PUSH_FAILED,
  },
  blocklistEnable: {
    fetchFailed: FETCH_FAILED,
    crowdSecDecisionsFailed: CROWDSEC_DECISIONS_FAILED,
    dbWriteFailed: DB_WRITE_FAILED,
    crowdSecPushFailed: CROWDSEC_PUSH_FAILED,
  },
  blocklistDisable: {
    crowdSecAlertsFetchFailed: CROWDSEC_ALERTS_FETCH_FAILED,
    crowdSecAlertDeleteFailed: CROWDSEC_ALERT_DELETE_FAILED,
    dbCleanupFailed: DB_CLEANUP_FAILED,
  },
  blocklistDelete: {
    crowdSecAlertsFetchFailed: CROWDSEC_ALERTS_FETCH_FAILED,
    crowdSecAlertDeleteFailed: CROWDSEC_ALERT_DELETE_FAILED,
    dbCleanupFailed: DB_CLEANUP_FAILED,
  },
  blocklistRefresh: {
    partialFailure: 'One or more blocklists failed to refresh',
  },
} as const;
