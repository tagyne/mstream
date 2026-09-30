import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { PlatformCommandController } from './platform-command.controller';

test('category search validates platform and query and delegates to the signed-in user', async () => {
  const calls: unknown[][] = [];
  const controller = new PlatformCommandController({
    searchCategoriesForUser: async (...args: unknown[]) => {
      calls.push(args);
      return { platform: 'kick', categories: [] };
    },
  } as never);

  assert.deepEqual(
    await controller.searchCategories(' kick ', '  games ', { user: { id: 'user-1' } } as never),
    { platform: 'kick', categories: [] },
  );
  assert.deepEqual(calls, [['user-1', 'kick', 'games']]);
});

test('category search rejects unsupported platforms and short queries', () => {
  const controller = new PlatformCommandController({} as never);

  assert.throws(
    () => controller.searchCategories('youtube', 'games', {} as never),
    BadRequestException,
  );
  assert.throws(
    () => controller.searchCategories('twitch', 'xy', {} as never),
    BadRequestException,
  );
});
