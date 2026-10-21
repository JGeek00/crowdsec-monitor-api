import { describe, it, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock('@/config/database', () => ({
  sequelize: { transaction: mocks.transaction },
}));

import { SequelizeUnitOfWork } from '@/infrastructure/persistence/sequelize/sequelize-unit-of-work';

describe('SequelizeUnitOfWork', () => {
  it('runs the callback inside a sequelize transaction and returns its result', async () => {
    mocks.transaction.mockImplementation(async (fn: () => Promise<string>) => fn());
    const uow = new SequelizeUnitOfWork();

    await expect(uow.run(async () => 'ok')).resolves.toBe('ok');
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it('propagates callback errors to the caller', async () => {
    mocks.transaction.mockImplementation(async (fn: () => Promise<void>) => fn());
    const uow = new SequelizeUnitOfWork();

    await expect(
      uow.run(async () => {
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
  });
});
