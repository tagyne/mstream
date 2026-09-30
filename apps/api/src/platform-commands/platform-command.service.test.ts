import assert from 'node:assert/strict';
import test from 'node:test';
import type { OutboundMessageResult } from '@mstream/contracts';
import { PlatformCommandService } from './platform-command.service';

const success: OutboundMessageResult = { platform: 'twitch', status: 'success', externalId: '1' };

test('multi-platform send returns independent results', async () => {
  const service = new PlatformCommandService(
    { sendMessage: async () => success } as never,
    {
      sendMessage: async () => ({
        platform: 'kick',
        status: 'network-error' as const,
        message: 'down',
      }),
    } as never,
    { getForUser: async () => null } as never,
  );
  assert.deepEqual(
    await service.sendMessage({
      message: 'hi',
      destinations: ['twitch', 'kick'],
      twitch: { accessToken: 'x', clientId: 'x', broadcasterId: '1', senderId: '2' },
      kick: { accessToken: 'x', broadcasterUserId: 1 },
    }),
    [success, { platform: 'kick', status: 'network-error', message: 'down' }],
  );
});

test('missing destination credentials is visible as a rejected result', async () => {
  const service = new PlatformCommandService(
    {} as never,
    {} as never,
    { getForUser: async () => null } as never,
  );
  assert.deepEqual(await service.sendMessage({ message: 'hi', destinations: ['kick'] }), [
    { platform: 'kick', status: 'rejected', message: 'Platform credentials are unavailable' },
  ]);
});

test('user commands use the linked Better Auth account token', async () => {
  let receivedToken = '';
  const accounts = {
    getForUser: async () => ({ externalId: '42', accessToken: 'fresh-token', scopes: [] }),
  };
  const service = new PlatformCommandService(
    {
      sendMessage: async (input: { accessToken: string }) => {
        receivedToken = input.accessToken;
        return success;
      },
    } as never,
    {} as never,
    accounts as never,
  );
  const result = await service.sendForUser('user-1', {
    message: 'hello',
    destinations: ['twitch'],
  });
  assert.deepEqual(result, [success]);
  assert.equal(receivedToken, 'fresh-token');
});

test('stream metadata reads both linked accounts and preserves a platform failure', async () => {
  const service = new PlatformCommandService(
    {
      getStream: async () => ({
        platform: 'twitch',
        status: 'success',
        title: 'Live',
        categoryId: '1',
        categoryName: 'Games',
      }),
      searchCategories: async () => [
        { id: '1', name: 'Games', imageUrl: 'https://img.test/games.jpg' },
      ],
    } as never,
    {
      getStream: async () => ({
        platform: 'kick',
        status: 'network-error',
        message: 'Kick API request failed',
      }),
    } as never,
    {
      getForUser: async (_userId: string, platform: string) => ({
        externalId: platform === 'twitch' ? '42' : '77',
        accessToken: 'secret',
        scopes: [],
      }),
    } as never,
  );
  assert.deepEqual(await service.getStreamForUser('user-1'), [
    {
      platform: 'twitch',
      status: 'success',
      title: 'Live',
      categoryId: '1',
      categoryName: 'Games',
      categoryImageUrl: 'https://img.test/games.jpg',
    },
    { platform: 'kick', status: 'network-error', message: 'Kick API request failed' },
  ]);
});

test('category search uses only the selected linked platform token and returns normalized options', async () => {
  let receivedToken = '';
  let receivedQuery = '';
  const service = new PlatformCommandService(
    {
      searchCategories: async (input: { accessToken: string; query: string }) => {
        receivedToken = input.accessToken;
        receivedQuery = input.query;
        return [{ id: '123', name: 'Games', imageUrl: 'https://img.test/game.jpg' }];
      },
    } as never,
    {} as never,
    {
      getForUser: async () => ({ externalId: '42', accessToken: 'private-token', scopes: [] }),
    } as never,
  );

  assert.deepEqual(await service.searchCategoriesForUser('user-1', 'twitch', '  games  '), {
    platform: 'twitch',
    categories: [{ id: '123', name: 'Games', imageUrl: 'https://img.test/game.jpg' }],
  });
  assert.equal(receivedToken, 'private-token');
  assert.equal(receivedQuery, 'games');
});

test('category search reports an unavailable platform without exposing its token', async () => {
  const service = new PlatformCommandService(
    {
      searchCategories: async () => {
        throw new Error('private-token');
      },
    } as never,
    {} as never,
    {
      getForUser: async () => ({ externalId: '42', accessToken: 'private-token', scopes: [] }),
    } as never,
  );

  assert.deepEqual(await service.searchCategoriesForUser('user-1', 'twitch', 'games'), {
    platform: 'twitch',
    categories: [],
    message: 'La recherche de catégories Twitch a échoué.',
  });
});

test('stream metadata resolves the Kick category image when channel data omits it', async () => {
  const service = new PlatformCommandService(
    { getStream: async () => ({ platform: 'twitch', status: 'rejected' }) } as never,
    {
      getStream: async () => ({
        platform: 'kick',
        status: 'success',
        title: 'Live',
        categoryId: '77',
        categoryName: 'Art',
      }),
      searchCategories: async () => [
        { id: '77', name: 'Art', imageUrl: 'https://img.test/art.jpg' },
      ],
    } as never,
    {
      getForUser: async (_userId: string, platform: string) => ({
        externalId: platform === 'twitch' ? '42' : '77',
        accessToken: 'secret',
        scopes: [],
      }),
    } as never,
  );

  const results = await service.getStreamForUser('user-1');
  assert.equal(results[1]?.categoryImageUrl, 'https://img.test/art.jpg');
});
