import assert from 'node:assert/strict';
import test from 'node:test';
import { PlatformAccountSyncService } from './platform-account-sync.service';

test('linked Twitch account updates live status and starts EventSub with its Better Auth token', async () => {
  process.env.TWITCH_CLIENT_ID = 'client-id';
  const statuses: unknown[] = [];
  const starts: unknown[][] = [];
  let stops = 0;
  const service = new PlatformAccountSyncService(
    { setStatus: (value: unknown) => statuses.push(value) } as never,
    {
      start: (...args: unknown[]) => starts.push(args),
      stop: () => {
        stops++;
      },
    } as never,
    {
      getForUser: async () => ({
        externalId: '42',
        accessToken: 'provider-secret',
        scopes: ['user:read:chat'],
      }),
    } as never,
  );

  const account = { id: 'ba-account', accountId: '42', providerId: 'twitch', userId: 'local-user' };
  await service.sync(account);
  assert.deepEqual(starts[0]?.slice(0, 3), ['provider-secret', 'client-id', '42']);
  assert.equal((statuses[0] as { state: string }).state, 'connected');

  await service.sync(account, true);
  assert.equal(stops, 1);
  assert.equal((statuses[1] as { state: string }).state, 'disconnected');
});

test('linked Kick account updates live status without starting Twitch', async () => {
  const statuses: unknown[] = [];
  const service = new PlatformAccountSyncService(
    { setStatus: (value: unknown) => statuses.push(value) } as never,
    {
      start: () => {
        throw new Error('Twitch should not start');
      },
      stop: () => {
        throw new Error('Twitch should not stop');
      },
    } as never,
    {
      getForUser: async () => ({ externalId: '24', accessToken: 'kick-secret', scopes: [] }),
    } as never,
  );

  const account = { id: 'ba-kick', accountId: '24', providerId: 'kick', userId: 'local-user' };
  await service.sync(account);
  await service.sync(account, true);
  assert.deepEqual(
    statuses.map((status) => (status as { state: string }).state),
    ['connected', 'disconnected'],
  );
});
