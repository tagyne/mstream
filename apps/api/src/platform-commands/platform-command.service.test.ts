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
