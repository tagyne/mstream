import assert from 'node:assert/strict';
import test from 'node:test';

test('built-in Twitch and Kick providers are configured with account linking and protected token routes', async () => {
  process.env.DATABASE_URL = 'postgres://localhost/mstream-test';
  process.env.BETTER_AUTH_SECRET = 'provider-test-secret-with-at-least-32-chars';
  process.env.TWITCH_CLIENT_ID = 'twitch-client';
  process.env.TWITCH_CLIENT_SECRET = 'twitch-secret';
  process.env.KICK_CLIENT_ID = 'kick-client';
  process.env.KICK_CLIENT_SECRET = 'kick-secret';
  const { auth } = await import('../auth');
  assert.deepEqual(Object.keys(auth.options.socialProviders ?? {}).sort(), ['kick', 'twitch']);
  assert.deepEqual(auth.options.socialProviders?.twitch?.scope, [
    'user:read:chat',
    'user:write:chat',
    'channel:manage:broadcast',
    'moderator:read:followers',
    'channel:read:subscriptions',
    'bits:read',
  ]);
  assert.equal(auth.options.account?.encryptOAuthTokens, true);
  assert.ok(auth.options.disabledPaths?.includes('/get-access-token'));
  assert.ok(auth.options.disabledPaths?.includes('/refresh-token'));
  assert.equal(auth.options.emailAndPassword?.enabled, undefined);
});
