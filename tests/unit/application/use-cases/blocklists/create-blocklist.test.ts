import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeBlocklist } from '@tests/setup/factories';
import type { BlocklistRepository } from '@/application/ports/blocklist-repository.port';
import type { ProcessTrackerPort } from '@/application/ports/process-tracker.port';
import type { BlocklistOpsPort } from '@/application/ports/blocklist-ops.port';
import type { Logger } from '@/application/ports/logger.port';
import type { Blocklist } from '@/domain/entities';
import {
  CreateBlocklistUseCase,
  ListAllowlistsUseCase,
  GetAllowlistUseCase,
} from '@/application/use-cases/blocklists';
import { NotFoundError, ConflictError, ServiceUnavailableError, UpstreamUnavailableError, ValidationError } from '@/domain/errors';
import type { LapiClient } from '@/application/ports/lapi-client.port';
import type { CrowdSecAllowlist } from '@/shared/crowdsec.types';

describe('CreateBlocklistUseCase', () => {
  let deps: {
    blocklistRepository: BlocklistRepository;
    bouncer: { checkBouncerConnection: ReturnType<typeof vi.fn>; isBouncerConnected: ReturnType<typeof vi.fn> };
    tracker: ProcessTrackerPort;
    ops: BlocklistOpsPort;
    logger: Logger;
  };
  let useCase: CreateBlocklistUseCase;

  beforeEach(() => {
    const blocklist: Blocklist = makeBlocklist({ id: 5, name: 'new-list' });
    deps = {
      blocklistRepository: {
        findByUrl: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(blocklist),
      } as unknown as BlocklistRepository,
      bouncer: {
        checkBouncerConnection: vi.fn().mockResolvedValue(undefined),
        isBouncerConnected: vi.fn().mockReturnValue(true),
      },
      tracker: {
        isSyncingBlocklists: vi.fn().mockReturnValue(false),
        createBlocklistImportProcess: vi.fn().mockReturnValue('p-import'),
        completeProcess: vi.fn(),
      } as unknown as ProcessTrackerPort,
      ops: {
        activateBlocklist: vi.fn().mockResolvedValue(undefined),
      } as unknown as BlocklistOpsPort,
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as Logger,
    };
    useCase = new CreateBlocklistUseCase(deps as never);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws ServiceUnavailable while blocklists are syncing', async () => {
    (deps.tracker.isSyncingBlocklists as ReturnType<typeof vi.fn>).mockReturnValue(true);
    await expect(useCase.execute({ url: 'https://a.com/bl.txt', name: 'x' })).rejects.toThrow(ServiceUnavailableError);
  });

  it('throws UpstreamUnavailable when the bouncer is unreachable', async () => {
    (deps.bouncer.isBouncerConnected as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(useCase.execute({ url: 'https://a.com/bl.txt', name: 'x' })).rejects.toThrow(UpstreamUnavailableError);
    expect(deps.logger.warn).toHaveBeenCalled();
  });

  it('rejects missing, non-string and blank urls', async () => {
    await expect(useCase.execute({ url: '', name: 'x' })).rejects.toThrow('url is required');
    await expect(useCase.execute({ url: undefined as unknown as string, name: 'x' })).rejects.toThrow('url is required');
    await expect(useCase.execute({ url: '   ', name: 'x' })).rejects.toThrow('url is required');
  });

  it('wraps unsafe URL rejections into a ValidationError', async () => {
    await expect(useCase.execute({ url: 'ftp://a.com/bl.txt', name: 'x' })).rejects.toThrow(ValidationError);
    await expect(useCase.execute({ url: 'not a url at all', name: 'x' })).rejects.toThrow(ValidationError);
  });

  it('rejects missing or blank names', async () => {
    await expect(useCase.execute({ url: 'https://a.com/bl.txt', name: '' })).rejects.toThrow('name is required');
    await expect(useCase.execute({ url: 'https://a.com/bl.txt', name: '  ' })).rejects.toThrow('name is required');
  });

  it('throws ConflictError when a blocklist with the same URL exists', async () => {
    (deps.blocklistRepository.findByUrl as ReturnType<typeof vi.fn>).mockResolvedValue(makeBlocklist());
    await expect(useCase.execute({ url: 'https://a.com/bl.txt', name: 'x' })).rejects.toThrow(ConflictError);
  });

  it('creates the blocklist, trims inputs and completes the background import', async () => {
    const res = await useCase.execute({ url: '  https://a.com/bl.txt  ', name: '  new-list  ' });
    expect(res.name).toBe('new-list');
    expect(deps.blocklistRepository.create).toHaveBeenCalledWith('https://a.com/bl.txt', 'new-list');
    await new Promise((r) => setTimeout(r, 0));
    expect(deps.tracker.completeProcess).toHaveBeenCalledWith('p-import', true);
  });

  it('reports failed background imports', async () => {
    (deps.ops.activateBlocklist as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    await useCase.execute({ url: 'https://a.com/bl.txt', name: 'x' });
    await new Promise((r) => setTimeout(r, 0));
    expect(deps.tracker.completeProcess).toHaveBeenCalledWith('p-import', false, 'boom');
    expect(deps.logger.error).toHaveBeenCalled();
  });
});

describe('allowlists sanitize branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const rawAllowlist = (overrides: Record<string, unknown> = {}): CrowdSecAllowlist =>
    ({
      name: 'test-list',
      description: 'd',
      created_at: '2026-10-20T18:00:00Z',
      updated_at: '2026-10-20T18:00:00Z',
      items: [{ value: '1.2.3.4', created_at: '2026-10-20T18:00:00Z', expiration: '2026-11-20T18:00:00Z' }],
      ...overrides,
    }) as unknown as CrowdSecAllowlist;

  it('ListAllowlistsUseCase canonicalizes valid dates and nulls invalid expirations', async () => {
    const lapiClient = {
      getAllowlists: vi.fn().mockResolvedValue([
        rawAllowlist({
          created_at: 'not-a-date',
          items: [
            { value: '1.2.3.4', created_at: '2026-10-20T18:00:00Z', expiration: 'garbage' },
            { value: '1.2.3.5', created_at: '2026-10-20T18:00:00Z', expiration: null },
          ],
        }),
      ]),
    } as unknown as LapiClient;

    const res = await new ListAllowlistsUseCase({ lapiClient }).execute();
    expect(res.length).toBe(1);
    expect(res.data[0].created_at).toBe('not-a-date'); // fallback preserves the raw value
    expect(res.data[0].items[0].expiration).toBeNull(); // invalid expiration -> null
    expect(res.data[0].items[1].expiration).toBeNull(); // null expiration -> null
  });

  it('GetAllowlistUseCase canonicalizes fields and throws NotFoundError when missing', async () => {
    const lapiClient = {
      getAllowlistByName: vi
        .fn()
        .mockResolvedValueOnce(rawAllowlist({ updated_at: 'invalid-date' }))
        .mockResolvedValueOnce(null),
    } as unknown as LapiClient;
    const useCase = new GetAllowlistUseCase({ lapiClient });

    const res = await useCase.execute('test-list');
    expect(res.created_at).toBe('2026-10-20T18:00:00Z');
    expect(res.updated_at).toBe('invalid-date'); // fallback preserves the raw value

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundError);
  });
});
