import { NotFoundError, ValidationError, ConflictError } from '@/domain/errors';
import type {
  NotificationChannelConfig,
  NotificationChannelType,
  NotificationHistoryEntry,
  UserNotificationChannel,
} from '@/domain/entities';
import type { Alert } from '@/domain/entities/alert.entity';
import type { UnparsedMetaData } from '@/shared/meta-data';
import type { AlertRepository } from '@/application/ports/alert-repository.port';
import type { NotificationRepository } from '@/application/ports/notification-repository.port';
import type { NotificationEnginePort, NotificationHistoryPort } from '@/application/ports/notification-engine.port';
import type { NotificationSender } from '@/application/ports/notification-sender.port';
import { findNotificationsUsingChannel } from '@/application/use-cases/notifications/channel-refs';
import { validateChannelConfig, isSecretKey } from '@/shared/utils/notification-channel';
import { notificationProviders, notificationProvidersVersion } from '@/constants/notification-providers';
import { sanitizeProviderDefinitions } from '@/shared/utils/notification-channel';

// Called by: delivery/http controllers (channels list endpoint)
export class ListChannelsUseCase {
  constructor(private readonly deps: { notificationRepository: NotificationRepository }) {}

  execute(): Promise<UserNotificationChannel[]> {
    return this.deps.notificationRepository.listChannels();
  }
}

// Called by: delivery/http controllers (channels detail endpoint)
export class GetChannelUseCase {
  constructor(private readonly deps: { notificationRepository: NotificationRepository }) {}

  async execute(id: number): Promise<UserNotificationChannel> {
    const row = await this.deps.notificationRepository.findChannelById(id);
    if (!row) {
      throw new NotFoundError('Channel not found');
    }
    return row;
  }
}

// Called by: delivery/http controllers (channels create endpoint)
export class CreateChannelUseCase {
  constructor(
    private readonly deps: {
      notificationRepository: NotificationRepository;
      engine: NotificationEnginePort;
    },
  ) {}

  async execute(input: { name: string; type: string; config: unknown }): Promise<UserNotificationChannel> {
    const errors = validateChannelConfig(input.type, input.config);
    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
    const row = await this.deps.notificationRepository.createChannel({
      name: input.name.trim(),
      // Validated against the provider definition above; stored types are the built-ins for now.
      type: input.type,
      config: input.config,
    });
    this.deps.engine.upsertChannelCache(row);
    return row;
  }
}

/**
 * Config merge rule (same provider type): incoming keys win; keys absent from
 * the payload keep their stored value (so omitted secrets survive edits); an
 * empty-string secret deletes it. When switching provider type the incoming
 * config is validated alone (old keys would be unknown fields otherwise).
 */
// Called by: delivery/http controllers (channels update endpoint)
export class UpdateChannelUseCase {
  constructor(
    private readonly deps: {
      notificationRepository: NotificationRepository;
      engine: NotificationEnginePort;
    },
  ) {}

  async execute(
    id: number,
    body: { name?: string; type?: string; config?: unknown },
  ): Promise<UserNotificationChannel> {
    const row = await this.deps.notificationRepository.findChannelById(id);
    if (!row) {
      throw new NotFoundError('Channel not found');
    }
    const nextType = body.type ?? row.type;
    if (body.type !== undefined && body.type !== row.type && body.config === undefined) {
      throw new ValidationError('config is required when changing provider type');
    }
    const typeChanged = body.type !== undefined && body.type !== row.type;
    let nextConfig = row.config as unknown as Record<string, unknown>;
    if (body.config !== undefined) {
      const incoming = body.config as unknown as Record<string, unknown>;
      const merged: Record<string, unknown> = typeChanged
        ? {}
        : { ...(row.config as unknown as Record<string, unknown>) };
      for (const [key, value] of Object.entries(incoming)) {
        if (typeof value === 'string' && value === '' && isSecretKey(nextType, key)) {
          delete merged[key];
        } else {
          merged[key] = value;
        }
      }
      const errors = validateChannelConfig(nextType, merged);
      if (errors.length > 0) {
        throw new ValidationError(errors.join(', '));
      }
      nextConfig = merged;
    }
    const updated = await this.deps.notificationRepository.updateChannel(id, {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      // Validated against the provider definition above; stored types are the built-ins for now.
      type: nextType as NotificationChannelType,
      config: nextConfig,
    });
    this.deps.engine.upsertChannelCache(updated);
    return updated;
  }
}

// Called by: delivery/http controllers (channels delete endpoint)
export class DeleteChannelUseCase {
  constructor(
    private readonly deps: {
      notificationRepository: NotificationRepository;
      engine: NotificationEnginePort;
    },
  ) {}

  async execute(id: number): Promise<void> {
    const row = await this.deps.notificationRepository.findChannelById(id);
    if (!row) {
      throw new NotFoundError('Channel not found');
    }
    const usedBy = await findNotificationsUsingChannel(this.deps.notificationRepository, row.id);
    if (usedBy.length > 0) {
      throw new ConflictError(
        `Channel is used by notification(s) ${usedBy.join(', ')}. Remove it from them before deleting.`,
      );
    }
    await this.deps.notificationRepository.deleteChannelById(id);
    this.deps.engine.removeChannelCache(id);
  }
}

/** Send a test message through one saved channel. Result is returned, not stored in history. */
// Called by: delivery/http controllers (channels test endpoint)
export class TestChannelUseCase {
  constructor(
    private readonly deps: {
      notificationRepository: NotificationRepository;
      sender: Pick<NotificationSender, 'dispatch'>;
    },
  ) {}

  async execute(id: number, message?: string): Promise<{ channelId: number; ok: boolean; detail: string | null }> {
    const row = await this.deps.notificationRepository.findChannelById(id);
    if (!row) {
      throw new NotFoundError('Channel not found');
    }
    const text = message?.trim() || `Test notification from "${row.name}"`;
    const [result] = await this.deps.sender.dispatch([{ type: row.type, config: row.config }], text, row.name);
    return { channelId: row.id, ok: result?.ok ?? false, detail: result?.detail ?? 'no result' };
  }
}

/** Test an unsaved channel config. Result is returned, not stored in history. */
// Called by: delivery/http controllers (channels test-inline endpoint)
export class TestInlineChannelUseCase {
  constructor(private readonly deps: { sender: Pick<NotificationSender, 'dispatch'> }) {}

  async execute(input: {
    type: string;
    config: unknown;
    message?: string;
  }): Promise<{ channelId: null; ok: boolean; detail: string | null }> {
    const errors = validateChannelConfig(input.type, input.config);
    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
    const text = input.message?.trim() || 'Test notification';
    const [result] = await this.deps.sender.dispatch(
      [{ type: input.type, config: input.config }],
      text,
      'Channel test',
    );
    return { channelId: null, ok: result?.ok ?? false, detail: result?.detail ?? 'no result' };
  }
}

/** Provider definitions so apps render channel forms generically. */
// Called by: delivery/http controllers (channels providers endpoint)
export class ListProvidersUseCase {
  execute() {
    return {
      version: notificationProvidersVersion,
      providers: sanitizeProviderDefinitions(notificationProviders),
    };
  }
}

/** Alerts that fired a sent notification, with full detail. */
// Called by: delivery/http controllers (notification history alerts endpoint)
export class GetHistoryAlertsUseCase {
  constructor(private readonly deps: { history: NotificationHistoryPort; alertRepository: AlertRepository }) {}

  async execute(historyId: string): Promise<Alert<UnparsedMetaData>[] | null> {
    const entry: NotificationHistoryEntry | undefined = this.deps.history.find(historyId);
    if (!entry) {
      return null;
    }
    if (entry.alertIds.length === 0) {
      return [];
    }
    return (await this.deps.alertRepository.findByIds(entry.alertIds)) as Alert<UnparsedMetaData>[];
  }
}
