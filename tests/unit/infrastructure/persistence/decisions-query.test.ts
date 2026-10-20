import { describe, it, expect } from 'vitest';
import { buildDecisionsWhere, fetchFilteringOptions } from '@/infrastructure/persistence/sequelize/decisions-query';
import { Op } from '@sequelize/core';
import { DecisionsTable } from '@/infrastructure/persistence/sequelize/models';
import { vi } from 'vitest';

describe('buildDecisionsWhere', () => {
  it('builds an empty where without filters', () => {
    expect(buildDecisionsWhere({}, false)).toEqual({});
  });

  it('maps simple equality filters', () => {
    const where = buildDecisionsWhere({ type: 'ban', scope: 'Ip' }, false);
    expect(where).toEqual({ type: 'ban', scope: 'Ip' });
  });

  it('wraps value in a LIKE clause', () => {
    const where = buildDecisionsWhere({ value: '1.2.3' }, false);
    expect(where.value).toEqual({ [Op.like]: '%1.2.3%' });
  });

  it('parses simulated as a boolean string', () => {
    expect(buildDecisionsWhere({ simulated: 'true' }, false).simulated).toBe(true);
    expect(buildDecisionsWhere({ simulated: 'false' }, false).simulated).toBe(false);
  });

  it('restricts to active decisions only when not grouping', () => {
    const where = buildDecisionsWhere({ only_active: 'true' }, false);
    expect(where.expiration).toEqual({ [Op.gt]: expect.any(Date) });
  });

  it('ignores only_active when grouping', () => {
    const where = buildDecisionsWhere({ only_active: 'true' }, true);
    expect(where.expiration).toBeUndefined();
  });

  it('ignores only_active when explicitly false', () => {
    const where = buildDecisionsWhere({ only_active: 'false' }, false);
    expect(where.expiration).toBeUndefined();
  });

  it('accepts only_active as a real boolean', () => {
    const where = buildDecisionsWhere({ only_active: true }, false);
    expect(where.expiration).toEqual({ [Op.gt]: expect.any(Date) });
  });

  it('supports single and multiple scenario filters', () => {
    const single = buildDecisionsWhere({ scenario: 'ssh-bf' }, false);
    expect(single.scenario).toEqual({
      [Op.or]: [{ [Op.like]: '%ssh-bf%' }],
    });

    const multi = buildDecisionsWhere({ scenario: ['ssh-bf', 'http-cve'] }, false);
    expect(multi.scenario).toEqual({
      [Op.or]: [{ [Op.like]: '%ssh-bf%' }, { [Op.like]: '%http-cve%' }],
    });
  });

  it('filters by exact ip list when ip_address is present', () => {
    const where = buildDecisionsWhere({ ip_address: ['1.2.3.4', '5.6.7.8'] }, false);
    expect(where.value).toEqual({ [Op.in]: ['1.2.3.4', '5.6.7.8'] });
  });
});

describe('fetchFilteringOptions', () => {
  it('collects countries and ip owners from decision sources', async () => {
    const findAll = vi
      .spyOn(DecisionsTable, 'findAll')
      .mockResolvedValue([
        { source: { cn: 'US', as_name: 'EXAMPLE-AS' } },
        { source: JSON.stringify({ cn: 'fr', as_name: 'OTHER-AS' }) },
        { source: null },
        {},
      ] as never);

    const options = await fetchFilteringOptions();
    expect(options.countries).toEqual(['US', 'fr']);
    expect(options.ipOwners).toEqual(['EXAMPLE-AS', 'OTHER-AS']);
    findAll.mockRestore();
  });
});
