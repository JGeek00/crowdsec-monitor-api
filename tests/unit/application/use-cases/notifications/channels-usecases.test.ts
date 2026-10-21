import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UpdateChannelUseCase,
  TestChannelUseCase,
  TestInlineChannelUseCase,
  GetHistoryAlertsUseCase,
} from '@/application/use-cases/notifications/channels.usecase';
import { NotFoundError, ValidationError } from '@/domain/errors';
import type { UserNotificationChannel } from '@/domain/entities';

function makeChannel(overrides: Partial<UserNotificationChannel> = {}): UserNotificationChannel {
  return { id: 1, name: 'mail', type: 'email', config: { to: 'a@b.c' }, ...overrides } as UserNotificationChannel;
}

describe('UpdateChannelUseCase validation branches', () => {
  let repo: { findChannelById: ReturnType<typeof vi.fn>; updateChannel: ReturnType<typeof vi.fn> };
  let engine: { upsertChannelCache: ReturnType<typeof vi.fn> };
  let useCase: UpdateChannelUseCase;

  beforeEach(() => {
    repo = { findChannelById: vi.fn(), updateChannel: vi.fn() };
    engine = { upsertChannelCache: vi.fn() };
    useCase = new UpdateChannelUseCase({ notificationRepository: repo as never, engine: engine as never });
  });

  it('throws NotFoundError for a missing channel', async () => {
    repo.findChannelById.mockResolvedValue(null);
    await expect(useCase.execute(1, { name: 'x' })).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when changing provider type without a config', async () => {
    repo.findChannelById.mockResolvedValue(makeChannel());
    await expect(useCase.execute(1, { type: 'ntfy' })).rejects.toThrow(
      'config is required when changing provider type',
    );
  });
});

describe('TestChannelUseCase message branches', () => {
  let repo: { findChannelById: ReturnType<typeof vi.fn> };
  let sender: { dispatch: ReturnType<typeof vi.fn> };
  let useCase: TestChannelUseCase;

  beforeEach(() => {
    repo = { findChannelById: vi.fn() };
    sender = { dispatch: vi.fn().mockResolvedValue([{ ok: true, detail: 'sent' }]) };
    useCase = new TestChannelUseCase({ notificationRepository: repo as never, sender: sender as never });
  });

  it('throws NotFoundError for a missing channel', async () => {
    repo.findChannelById.mockResolvedValue(null);
    await expect(useCase.execute(1)).rejects.toThrow(NotFoundError);
  });

  it('uses the default message and reports the dispatch result', async () => {
    repo.findChannelById.mockResolvedValue(makeChannel({ id: 3, name: 'chan3' }));

    const res = await useCase.execute(3);
    expect(sender.dispatch).toHaveBeenCalledWith(
      [{ type: 'email', config: { to: 'a@b.c' } }],
      'Test notification from "chan3"',
      'chan3',
    );
    expect(res).toEqual({ channelId: 3, ok: true, detail: 'sent' });
  });

  it('prefers the custom message and falls back when the dispatch returns no result', async () => {
    repo.findChannelById.mockResolvedValue(makeChannel({ id: 3 }));
    sender.dispatch.mockResolvedValue([]);

    const res = await useCase.execute(3, '  hello  ');
    expect(sender.dispatch.mock.calls[0][1]).toBe('hello');
    expect(res).toEqual({ channelId: 3, ok: false, detail: 'no result' });
  });
});

describe('TestInlineChannelUseCase validation branches', () => {
  let sender: { dispatch: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sender = { dispatch: vi.fn().mockResolvedValue([{ ok: true, detail: 'sent' }]) };
  });

  it('throws ValidationError with the config errors', async () => {
    const useCase = new TestInlineChannelUseCase({ sender: sender as never });
    await expect(useCase.execute({ type: 'email', config: {} })).rejects.toThrow(ValidationError);
    expect(sender.dispatch).not.toHaveBeenCalled();
  });

  it('validates and dispatches with the custom message', async () => {
    const useCase = new TestInlineChannelUseCase({ sender: sender as never });
    const config = { host: 'smtp.example.com', from: 'x@y.z', to: 'a@b.c' };

    const res = await useCase.execute({ type: 'email', config, message: 'ping' });
    expect(sender.dispatch).toHaveBeenCalledWith([{ type: 'email', config }], 'ping', 'Channel test');
    expect(res).toEqual({ channelId: null, ok: true, detail: 'sent' });
  });
});

describe('GetHistoryAlertsUseCase branches', () => {
  let history: { find: ReturnType<typeof vi.fn> };
  let alertRepository: { findByIds: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    history = { find: vi.fn() };
    alertRepository = { findByIds: vi.fn() };
  });

  it('returns null for an unknown history entry', async () => {
    history.find.mockReturnValue(undefined);
    const useCase = new GetHistoryAlertsUseCase({ history: history as never, alertRepository: alertRepository as never });
    await expect(useCase.execute('nope')).resolves.toBeNull();
  });

  it('returns an empty list when the entry has no alert ids', async () => {
    history.find.mockReturnValue({ id: 'h1', alertIds: [] });
    const useCase = new GetHistoryAlertsUseCase({ history: history as never, alertRepository: alertRepository as never });
    await expect(useCase.execute('h1')).resolves.toEqual([]);
    expect(alertRepository.findByIds).not.toHaveBeenCalled();
  });

  it('returns the alerts referenced by the history entry', async () => {
    history.find.mockReturnValue({ id: 'h1', alertIds: [1, 2] });
    alertRepository.findByIds.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const useCase = new GetHistoryAlertsUseCase({ history: history as never, alertRepository: alertRepository as never });
    await expect(useCase.execute('h1')).resolves.toEqual([{ id: 1 }, { id: 2 }]);
  });
});
