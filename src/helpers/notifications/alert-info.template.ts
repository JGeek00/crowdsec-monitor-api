import Handlebars from 'handlebars';

/**
 * Alert information block layout, mirroring the user-provided template.
 * Pre-computed context values arrive already resolved (flags, N/A fallbacks,
 * filtered event rows); Handlebars escapes every interpolated value.
 */
export const alertInfoTemplate = Handlebars.compile(`{{message}}<h1>Summary</h1>
<table>
  <tbody>
    <tr>
      <td>Scenaries</td>
      <td>{{summary.scenaries}}</td>
    </tr>
    <tr>
      <td>Countries</td>
      <td>{{summary.countries}}</td>
    </tr>
    <tr>
      <td>Targets</td>
      <td>{{summary.targets}}</td>
    </tr>
    <tr>
      <td>IP Owners</td>
      <td>{{summary.ipOwners}}</td>
    </tr>
  </tbody>
</table>
{{#each alerts}}
<h2>Alert {{id}}</h2>
<h3>Properties</h3>
<table>
  <tbody>
    <tr>
      <td>Declared at</td>
      <td>{{declaredAt}}</td>
    </tr>
    <tr>
      <td>Scenary</td>
      <td>{{scenario}}</td>
    </tr>
    <tr>
      <td>Country</td>
      <td>{{country}}</td>
    </tr>
    <tr>
      <td>Target</td>
      <td>{{target}}</td>
    </tr>
    <tr>
      <td>IP Owner</td>
      <td>{{ipOwner}}</td>
    </tr>
  </tbody>
</table>
<h3>Events</h3>
{{#each events}}{{#if rows.length}}<table>
  <tbody>
    {{#each rows}}
    <tr>
      <td>{{label}}</td>
      <td>{{value}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{/if}}{{/each}}
{{/each}}`);

/** Row of an event table: only the meta fields that have a value. */
export interface AlertInfoEventRow {
  label: string;
  value: string;
}

/** One event table's rows. */
export interface AlertInfoEvent {
  rows: AlertInfoEventRow[];
}

/** Pre-computed values for one alert block. */
export interface AlertInfoAlert {
  id: string;
  declaredAt: string;
  scenario: string;
  country: string;
  target: string;
  ipOwner: string;
  events: AlertInfoEvent[];
}

/** Template context: escaped by Handlebars when rendered. */
export interface AlertInfoContext {
  message: string;
  summary: {
    scenaries: string;
    countries: string;
    targets: string;
    ipOwners: string;
  };
  alerts: AlertInfoAlert[];
}
