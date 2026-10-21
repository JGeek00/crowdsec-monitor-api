import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { cleanRepoDb, closeRepoDb, initRepoDb } from '@tests/setup/repo-db';
import { SequelizeNotificationRepository } from '@/infrastructure/persistence/sequelize/repositories/sequelize-notification.repository';
import type { ConditionNode } from '@/domain/entities';

const condition: ConditionNode = { field: 'scenario', operator: 'equals', value: 'ssh-bf' };

describe('SequelizeNotificationRepository', () => {
  let repo: SequelizeNotificationRepository;

  beforeAll(async () => {
    await initRepoDb();
    repo = new SequelizeNotificationRepository();
  });
  beforeEach(cleanRepoDb);
  afterAll(closeRepoDb);

  const createNotification = async (name = 'notif', channelIds: number[] = []) =>
    repo.createNotification({
      name,
      description: null,
      enabled: true,
      condition,
      threshold: { count: 3, windowSeconds: 60 },
      message: 'alert!',
      includeAlertInfo: false,
      channelIds,
    });

  const createChannel = async (name = 'chan') =>
    repo.createChannel({ name, type: 'email', config: { to: 'a@b.c' } as never });

  it('createNotification and listNotifications round-trip the aggregate', async () => {
    await createNotification();

    const all = await repo.listNotifications();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('notif');
    expect(all[0].condition).toEqual(condition);
  });

  it('listOrdered returns notifications sorted by id', async () => {
    const first = await createNotification('first');
    const second = await createNotification('second');

    const ordered = await repo.listOrdered();
    expect(ordered.map((n) => n.id)).toEqual([first.id, second.id].sort((a, b) => a - b));
  });

  it('findById returns null for missing notifications', async () => {
    const created = await createNotification();
    expect((await repo.findById(created.id))?.name).toBe('notif');
    expect(await repo.findById(created.id + 999)).toBeNull();
  });

  it('updateFields persists changes and throws when the notification is missing', async () => {
    const created = await createNotification();

    const updated = await repo.updateFields(created.id, { name: 'renamed', enabled: false });
    expect(updated.name).toBe('renamed');
    expect(updated.enabled).toBe(false);

    await expect(repo.updateFields(created.id + 999, { name: 'x' })).rejects.toThrow('Notification not found');
  });

  it('deleteById removes the notification', async () => {
    const created = await createNotification();
    await repo.deleteById(created.id);
    expect(await repo.listNotifications()).toEqual([]);
  });

  it('createChannel, listChannels and findChannelById round-trip channels', async () => {
    const created = await createChannel('mail');

    const channels = await repo.listChannels();
    expect(channels).toHaveLength(1);
    expect(channels[0].name).toBe('mail');
    expect((await repo.findChannelById(created.id))?.type).toBe('email');
    expect(await repo.findChannelById(created.id + 999)).toBeNull();
  });

  it('updateChannel persists changes and throws when the channel is missing', async () => {
    const created = await createChannel();

    const updated = await repo.updateChannel(created.id, { name: 'renamed' });
    expect(updated.name).toBe('renamed');

    await expect(repo.updateChannel(created.id + 999, { name: 'x' })).rejects.toThrow('Channel not found');
  });

  it('deleteChannelById removes the channel', async () => {
    const created = await createChannel();
    await repo.deleteChannelById(created.id);
    expect(await repo.listChannels()).toEqual([]);
  });

  it('findChannelIdsByIds returns [] for empty input and matches existing channels', async () => {
    const one = await createChannel('one');
    const two = await createChannel('two');

    expect(await repo.findChannelIdsByIds([])).toEqual([]);
    expect(await repo.findChannelIdsByIds([one.id, two.id])).toEqual([one.id, two.id]);
    expect(await repo.findChannelIdsByIds([99])).toEqual([]);
  });

  it('findNotificationsUsingChannel returns the notifications referencing a channel', async () => {
    const used = await createChannel();
    const other = await createChannel('other');
    const using = await createNotification('using', [used.id]);
    await createNotification('not-using', [other.id]);

    expect(await repo.findNotificationsUsingChannel(used.id)).toEqual([using.id]);
    expect(await repo.findNotificationsUsingChannel(99)).toEqual([]);
  });
});
