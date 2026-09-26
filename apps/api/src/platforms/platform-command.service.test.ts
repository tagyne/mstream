import assert from 'node:assert/strict';
import test from 'node:test';
import type { OutboundMessageResult } from '@mstream/contracts';
import { PlatformCommandService } from './platform-command.service';

process.env.TOKEN_ENCRYPTION_SECRET = 'test-token-vault-secret-32-characters';

const success: OutboundMessageResult = { platform: 'twitch', status: 'success', externalId: '1' };

test('multi-platform send returns independent results', async () => {
  const service = new PlatformCommandService(
    { sendMessage: async () => success } as never,
    { sendMessage: async () => ({ platform: 'kick', status: 'network-error' as const, message: 'down' }) } as never,
  );
  assert.deepEqual(await service.sendMessage({ message: 'hi', destinations: ['twitch', 'kick'], twitch: { accessToken: 'x', clientId: 'x', broadcasterId: '1', senderId: '2' }, kick: { accessToken: 'x', broadcasterUserId: 1 } }), [success, { platform: 'kick', status: 'network-error', message: 'down' }]);
});

test('missing destination credentials is visible as a rejected result', async () => {
  const service = new PlatformCommandService({} as never, {} as never);
  assert.deepEqual(await service.sendMessage({ message: 'hi', destinations: ['kick'] }), [{ platform: 'kick', status: 'rejected', message: 'Platform credentials are unavailable' }]);
});

test('user commands refresh an expired connection before sending', async () => {
  const vault = new (await import('../platform-connections/token-vault')).TokenVault('command-refresh-secret-32-characters');
  const connection = { platform: 'twitch', externalId: '42', status: 'connected', accessTokenEncrypted: vault.encrypt('old'), accessTokenExpiresAt: new Date(Date.now() - 1) };
  let receivedToken = '';
  const service = new PlatformCommandService({ sendMessage: async (input: { accessToken: string }) => { receivedToken = input.accessToken; return success; } } as never, {} as never, { find: async () => [connection] } as never, vault, { refreshIfNeeded: async () => { connection.accessTokenEncrypted = vault.encrypt('new'); return connection; } } as never);
  const result = await service.sendForUser('user-1', { message: 'hello', destinations: ['twitch'] });
  assert.deepEqual(result, [success]);
  assert.equal(receivedToken, 'new');
});
