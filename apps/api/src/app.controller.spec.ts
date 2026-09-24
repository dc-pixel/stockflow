import { describe, expect, it, vi } from 'vitest';
import { AppController } from './app.controller';

describe('AppController.health', () => {
  it('returns a healthy response when the database is reachable', async () => {
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]) };
    const controller = new AppController(prisma as never);

    await expect(controller.health()).resolves.toMatchObject({
      status: 'ok',
      database: 'connected',
    });
  });

  it('throws 503 when the database check fails', async () => {
    const prisma = { $queryRaw: vi.fn().mockRejectedValue(new Error('database unavailable')) };
    const controller = new AppController(prisma as never);

    await expect(controller.health()).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        status: 'degraded',
        database: 'disconnected',
      }),
    });
  });
});
