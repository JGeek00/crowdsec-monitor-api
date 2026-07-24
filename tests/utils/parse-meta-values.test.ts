import { describe, it, expect } from 'vitest';
import { parseAlertMeta } from '@/utils/parse-meta-values';

describe('parseAlertMeta', () => {
  it('parses string meta values as JSON arrays', () => {
    const raw = {
      id: 1,
      uuid: 'abc',
      scenario: 'test',
      scenario_version: '1.0',
      scenario_hash: 'hash',
      message: 'test alert',
      capacity: 3,
      leakspeed: '10s',
      simulated: false,
      remediation: true,
      events_count: 1,
      machine_id: 'm1',
      source: { ip: '1.2.3.4', scope: 'Ip', value: '1.2.3.4' },
      labels: null,
      meta: [{ key: 'source_type', value: '["ssh","http"]' }],
      events: [],
      crowdsec_created_at: new Date(),
      start_at: new Date(),
      stop_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = parseAlertMeta(raw);
    expect(result.meta[0].value).toEqual(['ssh', 'http']);
  });

  it('wraps non-array string values in an array', () => {
    const raw = {
      id: 1,
      uuid: 'abc',
      scenario: 'test',
      scenario_version: '1.0',
      scenario_hash: 'hash',
      message: 'test alert',
      capacity: 3,
      leakspeed: '10s',
      simulated: false,
      remediation: true,
      events_count: 1,
      machine_id: 'm1',
      source: { ip: '1.2.3.4', scope: 'Ip', value: '1.2.3.4' },
      labels: null,
      meta: [{ key: 'source_type', value: 'ssh' }],
      events: [],
      crowdsec_created_at: new Date(),
      start_at: new Date(),
      stop_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = parseAlertMeta(raw);
    expect(result.meta[0].value).toEqual(['ssh']);
  });

  it('handles empty meta array', () => {
    const raw = {
      id: 1,
      uuid: 'abc',
      scenario: 'test',
      scenario_version: '1.0',
      scenario_hash: 'hash',
      message: 'test alert',
      capacity: 3,
      leakspeed: '10s',
      simulated: false,
      remediation: true,
      events_count: 1,
      machine_id: 'm1',
      source: { ip: '1.2.3.4', scope: 'Ip', value: '1.2.3.4' },
      labels: null,
      meta: [],
      events: [],
      crowdsec_created_at: new Date(),
      start_at: new Date(),
      stop_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = parseAlertMeta(raw);
    expect(result.meta).toEqual([]);
  });

  it('handles nested meta in events', () => {
    const raw = {
      id: 1,
      uuid: 'abc',
      scenario: 'test',
      scenario_version: '1.0',
      scenario_hash: 'hash',
      message: 'test alert',
      capacity: 3,
      leakspeed: '10s',
      simulated: false,
      remediation: true,
      events_count: 1,
      machine_id: 'm1',
      source: { ip: '1.2.3.4', scope: 'Ip', value: '1.2.3.4' },
      labels: null,
      meta: [],
      events: [
        {
          timestamp: '2026-07-23T00:00:00Z',
          meta: [{ key: 'event_type', value: '["connection","auth"]' }],
        },
      ],
      crowdsec_created_at: new Date(),
      start_at: new Date(),
      stop_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = parseAlertMeta(raw);
    expect(result.events[0].meta[0].value).toEqual(['connection', 'auth']);
  });

  it('handles null and undefined meta values', () => {
    const raw = {
      id: 1,
      uuid: 'abc',
      scenario: 'test',
      scenario_version: '1.0',
      scenario_hash: 'hash',
      message: 'test alert',
      capacity: 3,
      leakspeed: '10s',
      simulated: false,
      remediation: true,
      events_count: 1,
      machine_id: 'm1',
      source: { ip: '1.2.3.4', scope: 'Ip', value: '1.2.3.4' },
      labels: null,
      meta: [
        { key: 'null_val', value: null as unknown as string },
        { key: 'undef_val', value: undefined as unknown as string },
      ],
      events: [],
      crowdsec_created_at: new Date(),
      start_at: new Date(),
      stop_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = parseAlertMeta(raw);
    expect(result.meta[0].value).toEqual([]);
    expect(result.meta[1].value).toEqual([]);
  });

  it('handles non-array, non-string values by converting to string', () => {
    const raw = {
      id: 1,
      uuid: 'abc',
      scenario: 'test',
      scenario_version: '1.0',
      scenario_hash: 'hash',
      message: 'test alert',
      capacity: 3,
      leakspeed: '10s',
      simulated: false,
      remediation: true,
      events_count: 1,
      machine_id: 'm1',
      source: { ip: '1.2.3.4', scope: 'Ip', value: '1.2.3.4' },
      labels: null,
      // value as a number
      meta: [{ key: 'count', value: 42 as unknown as string }],
      events: [],
      crowdsec_created_at: new Date(),
      start_at: new Date(),
      stop_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = parseAlertMeta(raw);
    expect(result.meta[0].value).toEqual(['42']);
  });

  it('handles already-parsed array values', () => {
    const raw = {
      id: 1,
      uuid: 'abc',
      scenario: 'test',
      scenario_version: '1.0',
      scenario_hash: 'hash',
      message: 'test alert',
      capacity: 3,
      leakspeed: '10s',
      simulated: false,
      remediation: true,
      events_count: 1,
      machine_id: 'm1',
      source: { ip: '1.2.3.4', scope: 'Ip', value: '1.2.3.4' },
      labels: null,
      meta: [{ key: 'tags', value: ['a', 'b'] as unknown as string }],
      events: [],
      crowdsec_created_at: new Date(),
      start_at: new Date(),
      stop_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = parseAlertMeta(raw);
    expect(result.meta[0].value).toEqual(['a', 'b']);
  });
});
