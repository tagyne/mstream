import assert from 'node:assert/strict';
import test from 'node:test';
import { OAuthStateStore } from './oauth-security';
import { PlatformOAuthService } from './platform-oauth.service';
import { TokenVault } from './token-vault';

test('Kick OAuth uses S256 PKCE and persists encrypted tokens without returning them', async () => {
  process.env.KICK_CLIENT_ID = 'kick-client';
  process.env.KICK_CLIENT_SECRET = 'kick-secret';
  process.env.KICK_REDIRECT_URI = 'http://localhost/callback';
  const saved: Record<string, unknown>[] = [];
  const repository = {
    findOne: async () => null,
    create: (value: Record<string, unknown>) => value,
    save: async (value: Record<string, unknown>) => { saved.push(value); return value; },
  };
  const responses = [
    new Response(JSON.stringify({ access_token: 'access-secret', refresh_token: 'refresh-secret', expires_in: 3600, scope: ['user:read'] }), { status: 200 }),
    new Response(JSON.stringify({ data: [{ user_id: 1234 }] }), { status: 200 }),
  ];
  const started: unknown[][] = [];
  const statuses: unknown[] = [];
  const runtime = { start: (...args: unknown[]) => started.push(args) };
  const session = { setStatus: (status: unknown) => statuses.push(status) };
  const service = new PlatformOAuthService(repository as never, new OAuthStateStore(), new TokenVault('b'.repeat(32)), async () => responses.shift()!, runtime as never, session as never);
  const authorization = new URL(service.createAuthorizationUrl('kick', 'app-user-1'));
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
  const result = await service.complete('kick', authorization.searchParams.get('state')!, 'code');
  assert.deepEqual(result, { platform: 'kick', externalId: '1234' });
  assert.equal(saved.length, 1);
  assert.notEqual(saved[0].accessTokenEncrypted, 'access-secret');
  assert.notEqual(saved[0].refreshTokenEncrypted, 'refresh-secret');
  assert.equal(started.length, 0);
  assert.equal(statuses.length, 1);
});

test('Twitch OAuth starts the EventSub runtime after persisting the connection', async () => {
  process.env.TWITCH_CLIENT_ID = 'twitch-client';
  process.env.TWITCH_CLIENT_SECRET = 'twitch-secret';
  process.env.TWITCH_REDIRECT_URI = 'http://localhost/twitch/callback';
  const saved: Record<string, unknown>[] = [];
  const repository = { findOne: async () => null, create: (value: Record<string, unknown>) => value, save: async (value: Record<string, unknown>) => { saved.push(value); return value; } };
  const responses = [new Response(JSON.stringify({ access_token: 'twitch-access', refresh_token: 'twitch-refresh', expires_in: 3600 }), { status: 200 }), new Response(JSON.stringify({ data: [{ id: '42' }] }), { status: 200 })];
  const started: unknown[][] = [];
  const statuses: unknown[] = [];
  const runtime = { start: (...args: unknown[]) => started.push(args) };
  const session = { setStatus: (status: unknown) => statuses.push(status) };
  const service = new PlatformOAuthService(repository as never, new OAuthStateStore(), new TokenVault('c'.repeat(32)), async () => responses.shift()!, runtime as never);
  const authorization = new URL(service.createAuthorizationUrl('twitch', 'app-user-2'));
  await service.complete('twitch', authorization.searchParams.get('state')!, 'code');
  assert.equal(saved.length, 1);
  assert.deepEqual(started[0]?.slice(0, 3), ['twitch-access', 'twitch-client', '42']);
});
