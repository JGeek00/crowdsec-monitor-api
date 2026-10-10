import type { NotificationAlertEventMeta, NotificationAlertSnapshot } from '@/models';

/** Event meta keys rendered in the per-event table, with their row labels. */
const eventRowLabels: Record<string, string> = {
  http_verb: 'Method',
  target_fqdn: 'Target',
  http_path: 'Path',
  http_user_agent: 'User agent',
  datasource_path: 'Datasource path',
};

const rowTemplate = '    <tr>\n      <td>{label}</td>\n      <td>{value}</td>\n    </tr>\n';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

/** Server timezone name, resolved once per process (IANA, e.g. Europe/Madrid). */
const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
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

function targetOf(snapshot: NotificationAlertSnapshot): string {
  return snapshot.source.value || snapshot.source.ip;
}

function joinCell(values: string[]): string {
  return values.length > 0 ? escapeHtml(values.join(', ')) : 'N/A';
}

function eventRow(label: string, value: string): string {
  return rowTemplate.replace('{label}', label).replace('{value}', escapeHtml(value));
}

function buildEventTable(meta: NotificationAlertEventMeta[]): string {
  const rows = Object.entries(eventRowLabels)
    .map(([key, label]) => {
      const value = meta.find((m) => m.key === key && m.value.trim() !== '')?.value;
      return value !== undefined ? eventRow(label, value) : '';
    })
    .join('');
  return rows.length > 0 ? `<table>\n  <tbody>\n${rows}  </tbody>\n</table>\n` : '';
}

function buildAlertBlock(snapshot: NotificationAlertSnapshot): string {
  const id = snapshot.alertId !== undefined ? ` #${String(snapshot.alertId)}` : '';
  const rows = [
    eventRow('Declared at', formatDeclaredAt(snapshot.declaredAt)),
    eventRow('Scenary', snapshot.scenario),
    eventRow('Country', countryFlag(snapshot.source.cn)),
    eventRow('Target', targetOf(snapshot)),
    eventRow('IP Owner', snapshot.source.as_name ?? 'N/A'),
  ].join('');
  const events = snapshot.events.map(buildEventTable).join('');
  return `<h2>Alert${id}</h2>\n<h3>Properties</h3>\n<table>\n  <tbody>\n${rows}  </tbody>\n</table>\n<h3>Events</h3>\n${events}`;
}

/** Full alert-info HTML block: summary table plus one block per triggering alert. */
export function buildAlertInfoHtml(snapshots: NotificationAlertSnapshot[]): string {
  const summaryRows = [
    ['Scenaries', uniqueValues(snapshots.map((s) => s.scenario))],
    ['Countries', uniqueValues(snapshots.map((s) => s.source.cn)).map((code) => countryFlag(code))],
    ['Targets', uniqueValues(snapshots.map(targetOf))],
    ['IP Owners', uniqueValues(snapshots.map((s) => s.source.as_name))],
  ];
  const summary = summaryRows
    .map(([label, values]) => eventRow(label as string, joinCell(values as string[])))
    .join('');
  return `<h1>Summary</h1>\n<table>\n  <tbody>\n${summary}  </tbody>\n</table>\n${snapshots
    .map(buildAlertBlock)
    .join('')}`;
}

/** Email html part: escaped user message followed by the alert-info block. */
export function buildAlertInfoEmailHtml(message: string, snapshots: NotificationAlertSnapshot[]): string {
  return `${escapeHtml(message)}\n${buildAlertInfoHtml(snapshots)}`;
}
