import type { NotificationRepository } from '@/application/ports/notification-repository.port';

/** Returns the subset of ids with no matching channel row. */
export async function findMissingChannelIds(
  notificationRepository: Pick<NotificationRepository, 'findChannelIdsByIds'>,
  ids: number[],
): Promise<number[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const found = new Set(await notificationRepository.findChannelIdsByIds(unique));
  return unique.filter((id) => !found.has(id));
}

/** Returns the ids of notifications referencing the channel. */
export async function findNotificationsUsingChannel(
  notificationRepository: Pick<NotificationRepository, 'findNotificationsUsingChannel'>,
  channelId: number,
): Promise<number[]> {
  return notificationRepository.findNotificationsUsingChannel(channelId);
}
