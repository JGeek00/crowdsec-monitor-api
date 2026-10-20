import { NotificationChannelsTable, NotificationsTable } from '@/models';

/** Returns the subset of ids with no matching channel row. */
export async function findMissingChannelIds(ids: number[]): Promise<number[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const rows = await NotificationChannelsTable.findAll({ where: { id: unique } });
  const found = new Set(rows.map((r) => r.id));
  return unique.filter((id) => !found.has(id));
}

/** Returns the ids of notifications referencing the channel. */
export async function findNotificationsUsingChannel(channelId: number): Promise<number[]> {
  const all = await NotificationsTable.findAll();
  return all.filter((n) => (n.channelIds ?? []).includes(channelId)).map((n) => n.id);
}
