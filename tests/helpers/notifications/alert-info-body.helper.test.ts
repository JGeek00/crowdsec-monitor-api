import { describe, expect, it } from 'vitest';
import type { NotificationAlertSnapshot } from '@/models';
import {
  buildAlertInfoEmailHtml,
  buildAlertInfoHtml,
  countryFlag,
  formatDeclaredAt,
} from '@/infrastructure/notifications/alert-info-body';

/** Test assertions are layout-agnostic: inline styles are stripped first. */
const plain = (html: string): string => html.replace(/ style="[^"]*"/g, '');

function makeSnapshot(overrides: Partial<NotificationAlertSnapshot> = {}): NotificationAlertSnapshot {
  return {
    alertId: 2741,
    scenario: 'crowdsecurity/ssh-bf',
    source: { ip: '1.2.3.4', value: '1.2.3.4', scope: 'Ip', cn: 'ES', as_name: 'TELEFONICA' },
    declaredAt: new Date('2026-10-10T01:02:03Z'),
    events: [
      [
        { key: 'http_verb', value: 'POST' },
        { key: 'target_fqdn', value: 'example.com' },
        { key: 'http_path', value: '/wp-login.php' },
        { key: 'http_user_agent', value: 'Mozilla/5.0' },
        { key: 'datasource_path', value: '/var/log/nginx/access.log' },
        { key: 'http_status', value: '401' },
      ],
      [{ key: 'datasource_path', value: '/var/log/auth.log' }],
    ],
    ...overrides,
  };
}

describe('alert-info-body helper', () => {
  it('builds flag emojis and falls back to N/A', () => {
    expect(countryFlag('ES')).toBe('🇪🇸');
    expect(countryFlag('us')).toBe('🇺🇸');
    expect(countryFlag(undefined)).toBe('N/A');
    expect(countryFlag('')).toBe('N/A');
  });

  it('formats local hh:mm:ss with timezone name and UTC offset', () => {
    const date = new Date('2026-10-10T01:02:03Z');
    const formatted = formatDeclaredAt(date);
    expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2} \(.+, UTC[+-]\d{2}:\d{2}\)$/);
    const pad = (n: number) => String(n).padStart(2, '0');
    expect(formatted.startsWith(`${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`)).toBe(
      true,
    );
  });

  it('summarizes unique values in order of appearance', () => {
    const html = buildAlertInfoHtml([
      makeSnapshot(),
      makeSnapshot({
        alertId: 2742,
        scenario: 'crowdsecurity/http-bf',
        source: { ip: '5.6.7.8', value: '5.6.7.8', scope: 'Ip', cn: 'ES', as_name: 'AMAZON-02' },
      }),
      makeSnapshot({ alertId: 2743, scenario: 'crowdsecurity/http-bf' }),
    ]);
    expect(plain(html)).toContain('<td>Scenaries</td>\n      <td>crowdsecurity/ssh-bf, crowdsecurity/http-bf</td>');
    expect(plain(html)).toContain('<td>Countries</td>\n      <td>🇪🇸</td>');
    expect(plain(html)).toContain('<td>Targets</td>\n      <td>1.2.3.4, 5.6.7.8</td>');
    expect(plain(html)).toContain('<td>IP Owners</td>\n      <td>TELEFONICA, AMAZON-02</td>');
  });

  it('renders one block per alert with declared time, properties and event rows', () => {
    const html = buildAlertInfoHtml([makeSnapshot()]);
    expect(html).toContain('<h2>Alert #2741</h2>');
    expect(html).toContain('<h1>Summary</h1>');
    expect(plain(html)).toContain(
      `<td>Declared at</td>\n      <td>${formatDeclaredAt(makeSnapshot().declaredAt)}</td>`,
    );
    expect(plain(html)).toContain('<td>Scenary</td>\n      <td>crowdsecurity/ssh-bf</td>');
    expect(plain(html)).toContain('<td>Country</td>\n      <td>🇪🇸</td>');
    expect(plain(html)).toContain('<td>Target</td>\n      <td>1.2.3.4</td>');
    expect(plain(html)).toContain('<td>IP Owner</td>\n      <td>TELEFONICA</td>');
    expect(html.match(/<h3>Events<\/h3>/g)).toHaveLength(1);
    expect(plain(html)).toContain('<td>Method</td>\n      <td>POST</td>');
    expect(plain(html)).toContain('<td>Target</td>\n      <td>example.com</td>');
    expect(plain(html)).toContain('<td>Path</td>\n      <td>/wp-login.php</td>');
    expect(plain(html)).toContain('<td>User agent</td>\n      <td>Mozilla/5.0</td>');
    expect(plain(html)).toContain('<td>Datasource path</td>\n      <td>/var/log/nginx/access.log</td>');
    expect(plain(html)).not.toContain('<td>401</td>');
  });

  it('renders only the event rows whose value exists', () => {
    const html = buildAlertInfoHtml([makeSnapshot()]);
    const [, httpTable, sshTable] = plain(html).split('<h3>Events</h3>')[1]!.split('<table>');
    expect(plain(httpTable)).toContain('<td>Datasource path</td>\n      <td>/var/log/nginx/access.log</td>');
    expect(plain(sshTable)).toContain('<td>Datasource path</td>\n      <td>/var/log/auth.log</td>');
    expect(plain(sshTable)).not.toContain('<td>Method</td>');
    expect(plain(sshTable)).not.toContain('<td>User agent</td>');
  });

  it('shows N/A for missing country and IP owner', () => {
    const html = buildAlertInfoHtml([makeSnapshot({ source: { ip: '1.2.3.4', value: '1.2.3.4', scope: 'Ip' } })]);
    expect(plain(html)).toContain('<td>Country</td>\n      <td>N/A</td>');
    expect(plain(html)).toContain('<td>IP Owner</td>\n      <td>N/A</td>');
    expect(plain(html)).toContain('<td>Countries</td>\n      <td>N/A</td>');
  });

  it('styles cells with a gray border and separates event tables', () => {
    const html = buildAlertInfoHtml([makeSnapshot()]);
    expect(html).not.toMatch(/<td(?![^>]*style)/);
    expect(html).toContain('<td style="border: 1px solid #ccc; padding: 4px 8px;">Scenaries</td>');
    // Two non-empty event tables, each followed by 8px separation.
    expect(html.split('margin-bottom: 8px;')).toHaveLength(3);
    expect(html).toContain('<table style="border-collapse: collapse; margin-bottom: 8px;">');
    expect(html).toContain('<table style="border-collapse: collapse;">');
  });

  it('escapes values from alerts and composes the email html part', () => {
    const html = buildAlertInfoEmailHtml('Intento de <login> & fuerza bruta', [
      makeSnapshot({
        scenario: 'crowdsecurity/<script>',
        events: [[{ key: 'http_path', value: '/?x=<b>' }]],
      }),
    ]);
    expect(plain(html).startsWith('Intento de &lt;login&gt; &amp; fuerza bruta\n')).toBe(true);
    expect(plain(html)).toContain('<td>Scenary</td>\n      <td>crowdsecurity/&lt;script&gt;</td>');
    expect(plain(html)).toContain('<td>Path</td>\n      <td>/?x&#x3D;&lt;b&gt;</td>');
    expect(html).not.toContain('<script>');
  });
});
