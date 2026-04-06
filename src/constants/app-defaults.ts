export const BLOCKLIST_SCENARIO_REGEX = /^external\/blocklist \((.+)\)$/; // Scenario format used when pushing blocklist alerts: external/blocklist (<name>)
export const CS_MONITOR_BLOCKLIST_IMPORT_ORIGIN = 'cs-monitor-blocklist-import';
export const BLOCKLIST_WRITE_CHUNK_SIZE = 1000; // Number of IPs to write to DB in a single transaction when syncing blocklists
export const ALERTS_ORIGINS_FETCH = ['crowdsec', 'cscli', 'console', 'appsec']; // Origins to fetch when syncing alerts
