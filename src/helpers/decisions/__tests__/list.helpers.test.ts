import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models', () => ({
  DecisionsTable: {
    findAll: vi.fn(),
    col: { createdAt: 'created_at', updatedAt: 'updated_at', crowdsecCreatedAt: 'crowdsec_created_at' },
  },
}));

describe('buildDecisionsWhere', () => {
  it('returns empty where with no params', async () => {
    const { buildDecisionsWhere } = await import('@/helpers/decisions/list.helpers');
    const result = buildDecisionsWhere({}, false);
    expect(result).toEqual({});
  });

  it('filters by type and scope', async () => {
    const { buildDecisionsWhere } = await import('@/helpers/decisions/list.helpers');
    const result = buildDecisionsWhere({ type: 'ban', scope: 'Ip' }, false);
    expect(result.type).toBe('ban');
    expect(result.scope).toBe('Ip');
  });

  it('filters by value with LIKE', async () => {
    const { buildDecisionsWhere } = await import('@/helpers/decisions/list.helpers');
    const result = buildDecisionsWhere({ value: '1.2.3' }, false) as any;
    expect(result.value).toBeDefined();
  });

  it('filters only_active when not grouping', async () => {
    const { buildDecisionsWhere } = await import('@/helpers/decisions/list.helpers');
    const result = buildDecisionsWhere({ only_active: true }, false) as any;
    expect(result.expiration).toBeDefined();
  });

  it('skips only_active when grouping', async () => {
    const { buildDecisionsWhere } = await import('@/helpers/decisions/list.helpers');
    const result = buildDecisionsWhere({ only_active: true }, true);
    expect((result as any).expiration).toBeUndefined();
  });
});

describe('applyJsFilters', () => {
  const makeDecision = (overrides = {}): any => ({
    source: { cn: 'US', as_name: 'EXAMPLE-AS' },
    ...overrides,
  });

  it('filters by country', async () => {
    const { applyJsFilters } = await import('@/helpers/decisions/list.helpers');
    const items = [makeDecision({ source: { cn: 'US' } }), makeDecision({ source: { cn: 'CN' } })];
    const result = applyJsFilters(items, 'US');
    expect(result).toHaveLength(1);
  });

  it('filters by ip_owner', async () => {
    const { applyJsFilters } = await import('@/helpers/decisions/list.helpers');
    const items = [
      makeDecision({ source: { as_name: 'EXAMPLE-AS' } }),
      makeDecision({ source: { as_name: 'OTHER-AS' } }),
    ];
    const result = applyJsFilters(items, undefined, 'example');
    expect(result).toHaveLength(1);
  });

  it('returns all when no filters', async () => {
    const { applyJsFilters } = await import('@/helpers/decisions/list.helpers');
    const items = [makeDecision(), makeDecision()];
    expect(applyJsFilters(items)).toHaveLength(2);
  });
});

describe('groupDecisionsByIp', () => {
  const makeDecision = (overrides: any = {}): any => ({
    source: { ip: '1.2.3.4', cn: 'US', as_name: 'AS' },
    expiration: new Date(Date.now() + 3600000),
    ...overrides,
  });

  it('groups decisions by IP', async () => {
    const { groupDecisionsByIp } = await import('@/helpers/decisions/list.helpers');
    const d1 = makeDecision();
    const d2 = makeDecision({ source: { ip: '5.6.7.8' } });
    const result = groupDecisionsByIp([d1, d2], false, false);
    expect(result).toHaveLength(2);
  });

  it('skips decisions without IP', async () => {
    const { groupDecisionsByIp } = await import('@/helpers/decisions/list.helpers');
    const d = makeDecision({ source: { ip: undefined } });
    const result = groupDecisionsByIp([d], false, false);
    expect(result).toHaveLength(0);
  });

  it('filters decisions when onlyActive is true', async () => {
    const { groupDecisionsByIp } = await import('@/helpers/decisions/list.helpers');
    const expired = makeDecision({ expiration: new Date(Date.now() - 3600000) });
    const active = makeDecision();
    const result = groupDecisionsByIp([expired, active], true, true);
    expect(result[0]?.decisions).toHaveLength(1);
  });
});

describe('buildPaginatedResponse', () => {
  it('paginates items', async () => {
    const { buildPaginatedResponse } = await import('@/helpers/decisions/list.helpers');
    const items = [1, 2, 3, 4, 5];
    const result = buildPaginatedResponse(items, 2, 0, false);
    expect(result.items).toEqual([1, 2]);
    expect(result.pagination).toBeDefined();
  });

  it('throws PaginationError when offset exceeds total', async () => {
    const { buildPaginatedResponse, PaginationError } = await import('@/helpers/decisions/list.helpers');
    expect(() => buildPaginatedResponse([1, 2], 10, 5, false)).toThrow(PaginationError);
  });

  it('returns unpaged results', async () => {
    const { buildPaginatedResponse } = await import('@/helpers/decisions/list.helpers');
    const result = buildPaginatedResponse([1, 2, 3], 10, 0, true);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.pagination).toBeUndefined();
  });
});

describe('DECISIONS_QUERY', () => {
  it('has attributes and order', async () => {
    const { DECISIONS_QUERY } = await import('@/helpers/decisions/list.helpers');
    expect(DECISIONS_QUERY.attributes).toBeDefined();
    expect(DECISIONS_QUERY.order).toBeDefined();
  });
});
