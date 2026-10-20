/** Emitted after a successful LAPI alert sync batch has been persisted. */
export interface AlertSyncedEvent {
  kind: 'alert-synced';
  /** Number of alerts upserted in the sync batch. */
  syncedCount: number;
  /** ISO timestamp of the successful sync. */
  syncedAt: string;
}
