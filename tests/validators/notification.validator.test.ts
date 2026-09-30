import { describe, expect, it } from 'vitest';
import {
  createNotificationValidators,
  updateNotificationValidators,
  toggleNotificationValidators,
  createChannelValidators,
  updateChannelValidators,
  testChannelValidators,
} from '@/validators/notification.validator';
import { validationResult } from 'express-validator';

async function runBody(validators: { run: (req: unknown) => Promise<void> }[] | unknown[], body: Record<string, unknown>, params: Record<string, unknown> = {}) {
  const req = { body, params } as unknown as Record<string, unknown>;
  for (const validator of validators as { run: (req: unknown) => Promise<void> }[]) {
    await validator.run(req);
  }
  const { validationResult: getResult } = await import('express-validator');
  return getResult(req as never);
}

function validBody(): Record<string, unknown> {
  return {
    name: 'ssh alerts',
    condition: { type: 'leaf', field: 'scenario', operator: 'equals', value: 'crowdsecurity/ssh-bf' },
    message: 'SSH detected',
    channelIds: [1, 2],
  };
}

function validChannelBody(): Record<string, unknown> {
  return {
    name: 'ops email',
    type: 'email',
    config: { host: 'smtp.example.com', from: 'a@example.com', to: 'b@example.com' },
  };
}

describe('notification validators', () => {
  it('accepts a minimal valid payload', async () => {
    const result = await runBody(createNotificationValidators, validBody());
    expect(result.isEmpty()).toBe(true);
  });

  it('rejects missing name and bad channel ids', async () => {
    const bad = validBody();
    delete bad['name'];
    bad['channelIds'] = [0, 'x'];
    const result = await runBody(createNotificationValidators, bad);
    expect(result.isEmpty()).toBe(false);
  });

  it('rejects empty channelIds', async () => {
    const result = await runBody(createNotificationValidators, { ...validBody(), channelIds: [] });
    expect(result.isEmpty()).toBe(false);
  });

  it('rejects bad condition type and bad threshold', async () => {
    const bad = { ...validBody(), condition: { type: 'nope' }, threshold: { count: 0, windowSeconds: 5 } };
    const result = await runBody(createNotificationValidators, bad);
    expect(result.isEmpty()).toBe(false);
  });

  it('accepts threshold null and update with id param', async () => {
    const withThreshold = { ...validBody(), threshold: { count: 3, windowSeconds: 60 } };
    expect((await runBody(createNotificationValidators, withThreshold)).isEmpty()).toBe(true);
    expect((await runBody(updateNotificationValidators, { name: 'renamed' }, { id: '1' })).isEmpty()).toBe(true);
    expect((await runBody(updateNotificationValidators, { name: 'x' }, { id: 'bad' })).isEmpty()).toBe(false);
  });

  it('validates channel payloads', async () => {
    expect((await runBody(createChannelValidators, validChannelBody())).isEmpty()).toBe(true);
    expect((await runBody(createChannelValidators, { ...validChannelBody(), type: 'sms' })).isEmpty()).toBe(false);
    expect((await runBody(createChannelValidators, { type: 'email', config: {} })).isEmpty()).toBe(false);
    expect((await runBody(updateChannelValidators, { name: 'renamed' }, { id: '1' })).isEmpty()).toBe(true);
    expect((await runBody(updateChannelValidators, { name: 'x' }, { id: 'bad' })).isEmpty()).toBe(false);
    expect((await runBody(testChannelValidators, {}, { id: '1' })).isEmpty()).toBe(true);
    expect((await runBody(testChannelValidators, { message: 'hi' }, { id: '1' })).isEmpty()).toBe(true);
  });

  it('validates toggle payload', async () => {
    expect((await runBody(toggleNotificationValidators, { enabled: true }, { id: '2' })).isEmpty()).toBe(true);
    expect((await runBody(toggleNotificationValidators, { enabled: 'yes' }, { id: '2' })).isEmpty()).toBe(false);
    expect(validationResult).toBeDefined();
  });
});
