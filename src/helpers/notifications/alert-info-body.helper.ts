import type { NotificationAlertEventMeta, NotificationAlertSnapshot } from '@/models';
import {
  alertInfoTemplate,
  type AlertInfoAlert,
  type AlertInfoContext,
  type AlertInfoEventRow,
} from '@/helpers/notifications/alert-info.template';

/** Event meta keys rendered in the per-event table, with their row labels. */
const eventRowLabels: Record<string, string> = {
  http_verb: 'Method',
  target_fqdn: 'Target',
  http_path: 'Path',
  http_user_agent: 'User agent',
  datasource_path: 'Datasource path',
};

/** Server timezone name, resolved once per process (IANA, e.g. Europe/Madrid). */
const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Regional-indicator flag emoji for an ISO 3166-1 alpha-2 code; 'N/A' when missing. */
export function countryFlag(countryCode?: string): string {
  if (!countryCode) return 'N/A';
  const base = 127397;
  let flag = '';
  for (const scalar of countryCode.toUpperCase()) {
    flag += String.fromCodePoint(base + scalar.codePointAt(0)!);
  }
  return flag;
}

/** hh:mm:ss in the server's local time, with the used timezone and UTC offset. */
export function formatDeclaredAt(date: Date): string {
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  return `${time} (${serverTimeZone}, UTC${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)})`;
}

function uniqueValues(values: (string | undefined)[]): string[] {
  const seen: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed && !seen.includes(trimmed)) seen.push(trimmed);
  }
  return seen;
}

function joinCell(values: string[]): string {
  return values.length > 0 ? values.join(', ') : 'N/A';
}

function targetOf(snapshot: NotificationAlertSnapshot): string {
  return snapshot.source.value || snapshot.source.ip;
}

function eventRows(meta: NotificationAlertEventMeta[]): AlertInfoEventRow[] {
  return Object.entries(eventRowLabels)
    .map(([key, label]) => {
      const value = meta.find((m) => m.key === key && m.value.trim() !== '')?.value;
      return value !== undefined ? { label, value } : undefined;
    })
    .filter((row): row is AlertInfoEventRow => row !== undefined);
}

function toTemplateAlert(snapshot: NotificationAlertSnapshot): AlertInfoAlert {
  return {
    id: snapshot.alertId !== undefined ? `#${String(snapshot.alertId)}` : '',
    declaredAt: formatDeclaredAt(snapshot.declaredAt),
    scenario: snapshot.scenario,
    country: countryFlag(snapshot.source.cn),
    target: targetOf(snapshot),
    ipOwner: snapshot.source.as_name ?? 'N/A',
    events: snapshot.events.map((meta) => ({ rows: eventRows(meta) })),
  };
}

function toContext(message: string, snapshots: NotificationAlertSnapshot[]): AlertInfoContext {
  return {
    message,
    summary: {
      scenaries: joinCell(uniqueValues(snapshots.map((s) => s.scenario))),
      countries: joinCell(uniqueValues(snapshots.map((s) => s.source.cn)).map((code) => countryFlag(code))),
      targets: joinCell(uniqueValues(snapshots.map(targetOf))),
      ipOwners: joinCell(uniqueValues(snapshots.map((s) => s.source.as_name))),
    },
    alerts: snapshots.map(toTemplateAlert),
  };
}

/** Full alert-info HTML block: summary table plus one block per triggering alert. */
export function buildAlertInfoHtml(snapshots: NotificationAlertSnapshot[]): string {
  return alertInfoTemplate(toContext('', snapshots));
}

/** Email html part: user message followed by the alert-info block (all escaped by the template). */
export function buildAlertInfoEmailHtml(message: string, snapshots: NotificationAlertSnapshot[]): string {
  return alertInfoTemplate(toContext(`${message}\n`, snapshots));
}
