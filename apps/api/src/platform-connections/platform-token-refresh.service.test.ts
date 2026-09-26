import assert from 'node:assert/strict';
import test from 'node:test';
import { PlatformConnection } from '../database/entities/platform-connection.entity';
import { TokenVault } from './token-vault';
import { PlatformTokenRefreshService } from './platform-token-refresh.service';

test('refresh updates encrypted token and keeps platform connected', async () => {
  const vault = new TokenVault('refresh-test-secret-32-characters-long');
  const connection = Object.assign(new PlatformConnection(), { platform: 'kick', refreshTokenEncrypted: vault.encrypt('refresh'), accessTokenEncrypted: vault.encrypt('old'), scopes: [], status: 'error', lastError: 'expired' });
  const saved: PlatformConnection[] = [];
  process.env.TWITCH_CLIENT_ID = 'twitch-client';
  const started: unknown[][] = [];
  const runtime = { start: (...args: unknown[]) => started.push(args) };
  const statuses: unknown[] = [];
  const session = { setStatus: (status: unknown) => statuses.push(status) };
  const service = new PlatformTokenRefreshService({ save: async (value: PlatformConnection) => { saved.push(value); return value; } } as never, vault, async () => new Response(JSON.stringify({ access_token: 'new', refresh_token: 'new-refresh', expires_in: 3600 }), { status: 200 }), runtime as never, session as never);
  const result = await service.refresh(connection);
  assert.equal(result.status, 'connected'); assert.equal(vault.decrypt(result.accessTokenEncrypted), 'new'); assert.equal(saved.length, 1); assert.equal((statuses[0] as { state: string }).state, 'connected');
});

test('refresh restarts Twitch EventSub with the refreshed access token', async () => {
  process.env.TWITCH_CLIENT_ID = 'twitch-client';
  const vault = new TokenVault('refresh-test-secret-32-characters-long');
  const connection = Object.assign(new PlatformConnection(), { platform: 'twitch', externalId: '42', refreshTokenEncrypted: vault.encrypt('refresh'), accessTokenEncrypted: vault.encrypt('old'), scopes: [], status: 'error' });
  const started: unknown[][] = [];
  const runtime = { start: (...args: unknown[]) => started.push(args) };
  const service = new PlatformTokenRefreshService({ save: async (value: PlatformConnection) => value } as never, vault, async () => new Response(JSON.stringify({ access_token: 'new', refresh_token: 'new-refresh', expires_in: 3600 }), { status: 200 }), runtime as never);
  await service.refresh(connection);
  assert.deepEqual(started[0]?.slice(0, 3), ['new', 'twitch-client', '42']);
});

test('refresh failure isolates the platform with an actionable status', async () => {
  const vault = new TokenVault('refresh-test-secret-32-characters-long');
  const connection = Object.assign(new PlatformConnection(), { platform: 'twitch', refreshTokenEncrypted: vault.encrypt('refresh'), accessTokenEncrypted: vault.encrypt('old'), scopes: [], status: 'connected' });
  const statuses: unknown[] = [];
  const service = new PlatformTokenRefreshService({ save: async (value: PlatformConnection) => value } as never, vault, async () => new Response('{}', { status: 401 }), undefined, { setStatus: (status: unknown) => statuses.push(status) } as never);
  const result = await service.refresh(connection); assert.equal(result.status, 'error'); assert.match(result.lastError ?? '', /401/); assert.equal((statuses[0] as { state: string }).state, 'error');
});
