import { describe, it, expect } from 'vitest';
import {
  createBlocklistValidators,
  checkBlocklistValidators,
  checkDomainBlocklistValidators,
} from '@/validators/blocklist.validator';
import { validationResult } from 'express-validator';

async function runValidation(validators: any[], reqBody: Record<string, unknown>) {
  const req = { body: reqBody } as any;
  const res = {} as any;
  const next = () => {};
  for (const validator of validators) {
    await validator(req, res, next);
  }
  return validationResult(req);
}

describe('createBlocklistValidators', () => {
  it('passes for valid url and name', async () => {
    const result = await runValidation(createBlocklistValidators, {
      url: 'https://example.com/list.txt',
      name: 'my-list',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails when url is missing', async () => {
    const result = await runValidation(createBlocklistValidators, { name: 'my-list' });
    expect(result.isEmpty()).toBe(false);
    expect(
      result.array().some((e) => e.msg.includes('url is required') || e.msg.includes('url must be a string')),
    ).toBe(true);
  });

  it('fails when url is not a valid URL', async () => {
    const result = await runValidation(createBlocklistValidators, {
      url: 'not-a-url',
      name: 'my-list',
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when url has an invalid scheme', async () => {
    const result = await runValidation(createBlocklistValidators, {
      url: 'ftp://example.com/list.txt',
      name: 'my-list',
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when name is missing', async () => {
    const result = await runValidation(createBlocklistValidators, {
      url: 'https://example.com/list.txt',
    });
    expect(result.isEmpty()).toBe(false);
    expect(
      result.array().some((e) => e.msg.includes('name is required') || e.msg.includes('name must be a string')),
    ).toBe(true);
  });

  it('fails when name is empty', async () => {
    const result = await runValidation(createBlocklistValidators, {
      url: 'https://example.com/list.txt',
      name: '',
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when name exceeds 100 characters', async () => {
    const result = await runValidation(createBlocklistValidators, {
      url: 'https://example.com/list.txt',
      name: 'x'.repeat(101),
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when url exceeds 2048 characters', async () => {
    const result = await runValidation(createBlocklistValidators, {
      url: 'https://example.com/' + 'x'.repeat(2048),
      name: 'my-list',
    });
    expect(result.isEmpty()).toBe(false);
  });
});

describe('checkBlocklistValidators', () => {
  it('passes for valid IP array', async () => {
    const result = await runValidation(checkBlocklistValidators, {
      ips: ['1.2.3.4', '::1'],
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails when ips is not an array', async () => {
    const result = await runValidation(checkBlocklistValidators, { ips: 'bad' });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when ips contains invalid IPs', async () => {
    const result = await runValidation(checkBlocklistValidators, { ips: ['bad'] });
    expect(result.isEmpty()).toBe(false);
  });
});

describe('checkDomainBlocklistValidators', () => {
  it('passes for valid domain', async () => {
    const result = await runValidation(checkDomainBlocklistValidators, {
      domain: 'example.com',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('passes for subdomain', async () => {
    const result = await runValidation(checkDomainBlocklistValidators, {
      domain: 'sub.example.co.uk',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('fails when domain is missing', async () => {
    const result = await runValidation(checkDomainBlocklistValidators, {});
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when domain is empty', async () => {
    const result = await runValidation(checkDomainBlocklistValidators, { domain: '' });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails for invalid domain', async () => {
    const result = await runValidation(checkDomainBlocklistValidators, {
      domain: 'not a domain',
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('fails when domain exceeds 253 characters', async () => {
    const result = await runValidation(checkDomainBlocklistValidators, {
      domain: 'x'.repeat(254) + '.com',
    });
    expect(result.isEmpty()).toBe(false);
  });
});
