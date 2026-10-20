import { NotFoundError, ValidationError } from '@/domain/errors';
import type { UserNotification } from '@/domain/entities/notification.entity';
import type { NotificationRepository } from '@/application/ports/notification-repository.port';
import type { NotificationEnginePort, NotificationHistoryPort } from '@/application/ports/notification-engine.port';
import { findMissingChannelIds } from '@/application/use-cases/notifications/channel-refs';
import { withThresholdDefaults } from '@/application/use-cases/notifications/threshold-defaults';
import { isValidCondition } from '@/domain/value-objects/notification-condition';

// Called by: delivery/http controllers (notifications endpoints)
export class ListNotificationsUseCase {
  constructor(private readonly deps: { notificationRepository: NotificationRepository }) {}

  execute(): Promise<unknown> {
    return this.deps.notificationRepository.listOrdered();
  }
}

export class GetNotificationUseCase {
  constructor(private readonly deps: { notificationRepository: NotificationRepository }) {}

  async execute(id: number): Promise<UserNotification> {
    const row = await this.deps.notificationRepository.findById(id);
    if (!row) {
      throw new NotFoundError('Notification not found');
    }
    return row;
  }
}

export interface CreateNotificationInput {
  name: string;
  description?: string | null;
  enabled?: boolean;
  condition: unknown;
  threshold?: unknown;
  message: string;
  includeAlertInfo?: boolean;
  channelIds: number[];
}

export class CreateNotificationUseCase {
  constructor(
    private readonly deps: {
      notificationRepository: NotificationRepository;
      engine: NotificationEnginePort;
    },
  ) {}

  async execute(input: CreateNotificationInput): Promise<UserNotification> {
    const { name, description, enabled, condition, threshold, message, includeAlertInfo, channelIds } = input;

    if (!isValidCondition(condition)) {
      throw new ValidationError('condition has an unsupported shape');
    }
    const missing = await findMissingChannelIds(this.deps.notificationRepository, channelIds);
    if (missing.length > 0) {
      const err = new ValidationError(`Unknown channel(s): ${missing.join(', ')}`);
      (err as ValidationError & { status: number }).status = 422;
      throw err;
    }

    const row = await this.deps.notificationRepository.createNotification({
      name: name.trim(),
      description: description?.trim() ? description.trim() : null,
      enabled: enabled ?? true,
      condition,
      threshold: withThresholdDefaults(threshold as never),
      message: message.trim(),
      includeAlertInfo: includeAlertInfo === true,
      channelIds: [...new Set(channelIds)],
    });
    const plain = row;
    this.deps.engine.upsertCache(plain as never);
    return plain;
  }
}

export class UpdateNotificationUseCase {
  constructor(
    private readonly deps: {
      notificationRepository: NotificationRepository;
      engine: NotificationEnginePort;
    },
  ) {}

  async execute(id: number, body: Record<string, unknown>): Promise<UserNotification> {
    const row = await this.deps.notificationRepository.findById(id);
    if (!row) {
      throw new NotFoundError('Notification not found');
    }

    const { channelIds, threshold, ...rest } = body as {
      channelIds?: number[];
      threshold?: unknown;
      condition?: unknown;
      [key: string]: unknown;
    };

    if (body.condition !== undefined && !isValidCondition(body.condition)) {
      throw new ValidationError('condition has an unsupported shape');
    }
    if (channelIds !== undefined) {
      const missing = await findMissingChannelIds(this.deps.notificationRepository, channelIds);
      if (missing.length > 0) {
        const err = new ValidationError(`Unknown channel(s): ${missing.join(', ')}`);
        (err as ValidationError & { status: number }).status = 422;
        throw err;
      }
    }

    const updated = await this.deps.notificationRepository.updateFields(id, {
      ...rest,
      ...(threshold !== undefined ? { threshold: withThresholdDefaults(threshold as never) } : {}),
      ...(channelIds !== undefined ? { channelIds: [...new Set(channelIds)] } : {}),
    });

    this.deps.engine.upsertCache(updated as never);
    return updated;
  }
}

export class ToggleNotificationUseCase {
  constructor(
    private readonly deps: {
      notificationRepository: NotificationRepository;
      engine: NotificationEnginePort;
    },
  ) {}

  async execute(id: number, enabled: boolean): Promise<UserNotification> {
    const row = await this.deps.notificationRepository.findById(id);
    if (!row) {
      throw new NotFoundError('Notification not found');
    }
    const updated = await this.deps.notificationRepository.updateFields(id, { enabled });
    this.deps.engine.upsertCache(updated as never);
    return updated;
  }
}

export class DeleteNotificationUseCase {
  constructor(
    private readonly deps: {
      notificationRepository: NotificationRepository;
      engine: NotificationEnginePort;
    },
  ) {}

  async execute(id: number): Promise<void> {
    const row = await this.deps.notificationRepository.findById(id);
    if (!row) {
      throw new NotFoundError('Notification not found');
    }
    await this.deps.notificationRepository.deleteById(id);
    this.deps.engine.removeFromCache(id);
  }
}

export class GetNotificationHistoryUseCase {
  constructor(private readonly deps: { history: NotificationHistoryPort }) {}

  execute(): { data: unknown[]; total: number } {
    const data = this.deps.history.list();
    return { data, total: data.length };
  }
}
