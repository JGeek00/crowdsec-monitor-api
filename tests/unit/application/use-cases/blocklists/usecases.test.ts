import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeBlocklist, makeBlocklistIp } from '@tests/setup/factories';
import type { BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import type { ProcessTrackerPort } from '@/application/ports/process-tracker.port';
import type { BlocklistOpsPort } from '@/application/ports/blocklist-ops.port';
import type { Logger } from '@/application/ports/logger.port';
import type { LapiClient } from '@/application/ports/lapi-client.port';
import type { BlocklistIpLookup, AllowlistIpLookup, DomainResolver } from '@/application/ports/ip-lookup.port';
import type { Blocklist } from '@/domain/entities';
import {
  ToggleBlocklistUseCase,
  DeleteBlocklistUseCase,
  RefreshSingleBlocklistUseCase,
  RefreshAllBlocklistsUseCase,
  GetBlocklistIpsUseCase,
  ListBlocklistsUseCase,
  CheckIpUseCase,
  CheckDomainUseCase,
  CheckIpsInListUseCase,
} from '@/application/use-cases/blocklists';
import {
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  UpstreamUnavailableError,
  ValidationError,
} from '@/domain/errors';

function makeDeps() {
  const blocklist: Blocklist = makeBlocklist();
  const blocklistRepository = {
    findById: vi.fn().mockResolvedValue(blocklist),
    setEnabled: vi.fn().mockResolvedValue({ ...blocklist, enabled: true }),
    getIps: vi.fn().mockResolvedValue([makeBlocklistIp()]),
    deleteById: vi.fn().mockResolvedValue(true),
    getIpsPage: vi.fn(),
    listMerged: vi.fn(),
  } as unknown as BlocklistRepository;
  const tracker = {
    isSyncingBlocklists: vi.fn().mockReturnValue(false),
    isBlocklistBusy: vi.fn().mockReturnValue(false),
    isAnyBlocklistProcessRunning: vi.fn().mockReturnValue(false),
    createBlocklistEnableProcess: vi.fn().mockReturnValue('p-enable'),
    createBlocklistDisableProcess: vi.fn().mockReturnValue('p-disable'),
    createBlocklistDeleteProcess: vi.fn().mockReturnValue('p-delete'),
    completeProcess: vi.fn(),
  } as unknown as ProcessTrackerPort;
  const ops = {
    activateBlocklist: vi.fn().mockResolvedValue(undefined),
    deleteBlocklistAlerts: vi.fn().mockResolvedValue(undefined),
    refreshBlocklists: vi.fn().mockResolvedValue(undefined),
  } as unknown as BlocklistOpsPort;
  const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as Logger;
  const bouncer = {
    checkBouncerConnection: vi.fn().mockResolvedValue(undefined),
    isBouncerConnected: vi.fn().mockReturnValue(true),
  };
  return { blocklistRepository, tracker, ops, logger, bouncer };
}

describe('ToggleBlocklistUseCase', () => {
  let deps: ReturnType<typeof makeDeps>;
  let useCase: ToggleBlocklistUseCase;

  beforeEach(() => {
    deps = makeDeps();
    useCase = new ToggleBlocklistUseCase(deps as never);
  });

  it('throws ServiceUnavailable while blocklists are syncing', async () => {
    (deps.tracker.isSyncingBlocklists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await expect(useCase.execute(1, true)).rejects.toThrow(ServiceUnavailableError);
  });

  it('throws ValidationError when enabled is not a boolean', async () => {
    await expect(useCase.execute(1, 'yes' as unknown as boolean)).rejects.toThrow(ValidationError);
  });

  it('throws NotFoundError when the blocklist does not exist', async () => {
    (deps.blocklistRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(useCase.execute(1, true)).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when the blocklist has a running process', async () => {
    (deps.tracker.isBlocklistBusy as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await expect(useCase.execute(1, true)).rejects.toThrow(ConflictError);
  });

  it('throws UpstreamUnavailable when enabling with the bouncer unreachable', async () => {
    (deps.bouncer.isBouncerConnected as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(useCase.execute(1, true)).rejects.toThrow(UpstreamUnavailableError);
  });

  it('enables through the bouncer and tracks the enable process', async () => {
    const res = await useCase.execute(1, true);
    expect(res.enabled).toBe(true);
    expect(deps.bouncer.checkBouncerConnection).toHaveBeenCalled();
    expect(deps.tracker.createBlocklistEnableProcess).toHaveBeenCalled();
    expect(deps.ops.activateBlocklist).toHaveBeenCalled();
  });

  it('disables without touching the bouncer and counts IPs first', async () => {
    await useCase.execute(1, false);
    expect(deps.bouncer.checkBouncerConnection).not.toHaveBeenCalled();
    expect(deps.blocklistRepository.getIps).toHaveBeenCalledWith(1);
    expect(deps.tracker.createBlocklistDisableProcess).toHaveBeenCalled();
    expect(deps.ops.deleteBlocklistAlerts).toHaveBeenCalled();
  });

  it('reports failed background CrowdSec operations', async () => {
    (deps.ops.activateBlocklist as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    await useCase.execute(1, true);
    await new Promise((r) => setTimeout(r, 0));
    expect(deps.tracker.completeProcess).toHaveBeenCalledWith('p-enable', false, 'boom');
    expect(deps.logger.error).toHaveBeenCalled();
  });
});

describe('DeleteBlocklistUseCase', () => {
  let deps: ReturnType<typeof makeDeps>;
  let useCase: DeleteBlocklistUseCase;

  beforeEach(() => {
    deps = makeDeps();
    useCase = new DeleteBlocklistUseCase(deps as never);
  });

  it('throws ServiceUnavailable while blocklists are syncing', async () => {
    (deps.tracker.isSyncingBlocklists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await expect(useCase.execute(1)).rejects.toThrow(ServiceUnavailableError);
  });

  it('throws NotFoundError when the blocklist does not exist', async () => {
    (deps.blocklistRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(useCase.execute(1)).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when the blocklist has a running process', async () => {
    (deps.tracker.isBlocklistBusy as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await expect(useCase.execute(1)).rejects.toThrow(ConflictError);
  });

  it('deletes locally and schedules the background CrowdSec cleanup', async () => {
    await useCase.execute(1);
    expect(deps.tracker.createBlocklistDeleteProcess).toHaveBeenCalled();
    expect(deps.blocklistRepository.deleteById).toHaveBeenCalledWith(1);
    expect(deps.ops.deleteBlocklistAlerts).toHaveBeenCalled();
  });

  it('reports failed background CrowdSec cleanups', async () => {
    (deps.ops.deleteBlocklistAlerts as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    await useCase.execute(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(deps.tracker.completeProcess).toHaveBeenCalledWith('p-delete', false, 'boom');
    expect(deps.logger.error).toHaveBeenCalled();
  });
});

describe('RefreshSingleBlocklistUseCase', () => {
  let deps: ReturnType<typeof makeDeps>;
  let useCase: RefreshSingleBlocklistUseCase;

  beforeEach(() => {
    deps = makeDeps();
    useCase = new RefreshSingleBlocklistUseCase(deps as never);
  });

  it('throws ServiceUnavailable while blocklists are syncing', async () => {
    (deps.tracker.isSyncingBlocklists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await expect(useCase.execute(1)).rejects.toThrow(ServiceUnavailableError);
  });

  it('throws NotFoundError when the blocklist does not exist', async () => {
    (deps.blocklistRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(useCase.execute(1)).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when the blocklist has a running process', async () => {
    (deps.tracker.isBlocklistBusy as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await expect(useCase.execute(1)).rejects.toThrow(ConflictError);
  });

  it('refreshes the blocklist in the background', async () => {
    await useCase.execute(1);
    expect(deps.ops.refreshBlocklists).toHaveBeenCalledWith(expect.anything());
  });

  it('reports failed background refreshes', async () => {
    (deps.ops.refreshBlocklists as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    await useCase.execute(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(deps.logger.error).toHaveBeenCalled();
  });
});

describe('RefreshAllBlocklistsUseCase', () => {
  let deps: ReturnType<typeof makeDeps>;
  let useCase: RefreshAllBlocklistsUseCase;

  beforeEach(() => {
    deps = makeDeps();
    useCase = new RefreshAllBlocklistsUseCase(deps as never);
  });

  it('throws ServiceUnavailable when any blocklist process is running', async () => {
    (deps.tracker.isAnyBlocklistProcessRunning as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await expect(useCase.execute()).rejects.toThrow(ServiceUnavailableError);
  });

  it('refreshes all blocklists in the background', async () => {
    await useCase.execute();
    expect(deps.ops.refreshBlocklists).toHaveBeenCalledWith();
  });

  it('reports failed background refreshes', async () => {
    (deps.ops.refreshBlocklists as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    await useCase.execute();
    await new Promise((r) => setTimeout(r, 0));
    expect(deps.logger.error).toHaveBeenCalled();
  });
});

describe('GetBlocklistIpsUseCase', () => {
  const blocklistIps = [makeBlocklistIp(), makeBlocklistIp({ id: 2, value: '10.0.0.2' })];

  function makeUseCase(result: unknown) {
    const repo = { getIpsPage: vi.fn().mockResolvedValue(result) } as unknown as BlocklistRepository;
    return new GetBlocklistIpsUseCase({ blocklistRepository: repo });
  }

  const opts = { limit: 100, offset: 0, unpaged: false, onlyStrings: false };

  it('throws NotFoundError when the blocklist does not exist', async () => {
    await expect(makeUseCase(null).execute('1', opts)).rejects.toThrow(NotFoundError);
  });

  it('returns raw IP entities by default', async () => {
    const res = await makeUseCase({ total: 2, items: blocklistIps }).execute('1', opts);
    expect(res.items).toEqual(blocklistIps);
    expect((res as { pagination: unknown }).pagination).toEqual({ page: 1, amount: 2, total: 2 });
  });

  it('maps items to plain strings with onlyStrings', async () => {
    const res = await makeUseCase({ total: 2, items: blocklistIps }).execute('1', { ...opts, onlyStrings: true });
    expect(res.items).toEqual(['10.0.0.1', '10.0.0.2']);
  });

  it('omits pagination when unpaged', async () => {
    const res = await makeUseCase({ total: 2, items: blocklistIps }).execute('1', { ...opts, unpaged: true });
    expect(res).toEqual({ total: 2, items: blocklistIps });
  });
});

describe('ListBlocklistsUseCase', () => {
  function makeUseCase(listMerged: unknown) {
    const repo = { listMerged: vi.fn().mockResolvedValue(listMerged) } as unknown as BlocklistRepository;
    return new ListBlocklistsUseCase({ blocklistRepository: repo });
  }

  function row(overrides: Record<string, unknown> = {}) {
    return {
      id: 3,
      name: 'merged',
      blocklistIps: [{ value: '10.0.0.9' }],
      ...overrides,
    };
  }

  it('merges api and cs blocklists with pagination by default', async () => {
    const useCase = makeUseCase({ apiRows: [row()], csRows: [row({ id: 4 })], total: 2 });
    const res = await useCase.execute({} as never);
    expect(res.items).toHaveLength(2);
    expect(res.items[0].type).toBe('api');
    expect(res.items[1].type).toBe('cs');
    expect(res.items[0].id).toBe('3');
    expect((res as { pagination: unknown }).pagination).toEqual({ page: 1, amount: 2, total: 2 });
  });

  it('maps IPs to plain strings with include_ips=ip_string', async () => {
    const useCase = makeUseCase({ apiRows: [row()], csRows: [], total: 1 });
    const res = await useCase.execute({ include_ips: 'ip_string' } as never);
    expect(res.items[0].blocklistIps).toEqual(['10.0.0.9']);
  });

  it('keeps full IP entities with include_ips=full', async () => {
    const useCase = makeUseCase({ apiRows: [row()], csRows: [], total: 1 });
    const res = await useCase.execute({ include_ips: 'full' } as never);
    expect(res.items[0].blocklistIps).toEqual([{ value: '10.0.0.9' }]);
  });

  it('omits pagination when unpaged', async () => {
    const useCase = makeUseCase({ apiRows: [], csRows: [row()], total: 1 });
    const res = await useCase.execute({ unpaged: true } as never);
    expect((res as { total: unknown }).total).toBe(1);
    expect((res as { pagination: unknown }).pagination).toBeUndefined();
  });
});

describe('check use cases', () => {
  it('CheckIpUseCase maps every ip to its blocklists', async () => {
    const lookup = vi.fn().mockResolvedValue(new Map([['10.0.0.1', ['bl']]])) as unknown as BlocklistIpLookup;
    const useCase = new CheckIpUseCase({ blocklistLookup: lookup });
    const res = await useCase.execute(['10.0.0.1', '9.9.9.9']);
    expect(res.results).toEqual([
      { ip: '10.0.0.1', blocklists: ['bl'] },
      { ip: '9.9.9.9', blocklists: [] },
    ]);
  });

  it('CheckDomainUseCase reports unresolvable domains', async () => {
    const resolveDomain = vi.fn().mockResolvedValue([]) as unknown as DomainResolver;
    const useCase = new CheckDomainUseCase({
      blocklistLookup: vi.fn() as unknown as BlocklistIpLookup,
      resolveDomain,
    });
    await expect(useCase.execute('nonexistent.invalid')).resolves.toEqual({ unresolvable: true });
  });

  it('CheckDomainUseCase resolves and looks up the resolved IPs', async () => {
    const resolveDomain = vi.fn().mockResolvedValue(['10.0.0.1']) as unknown as DomainResolver;
    const lookup = vi.fn().mockResolvedValue(new Map([['10.0.0.1', ['bl']]])) as unknown as BlocklistIpLookup;
    const useCase = new CheckDomainUseCase({ blocklistLookup: lookup, resolveDomain });
    await expect(useCase.execute('example.com')).resolves.toEqual({
      domain: 'example.com',
      ips: [{ ip: '10.0.0.1', blocklists: ['bl'] }],
    });
  });

  it('CheckIpsInListUseCase merges blocklist and allowlist matches', async () => {
    const blocklistLookup = vi
      .fn()
      .mockResolvedValue(new Map([['10.0.0.1', ['bl']]])) as unknown as BlocklistIpLookup;
    const allowlistLookup = vi.fn().mockResolvedValue(new Map()) as unknown as AllowlistIpLookup;
    const useCase = new CheckIpsInListUseCase({ blocklistLookup, allowlistLookup });
    const res = await useCase.execute(['10.0.0.1']);
    expect(res.results).toEqual([{ ip: '10.0.0.1', blocklists: ['bl'], allowlists: [] }]);
  });
});
