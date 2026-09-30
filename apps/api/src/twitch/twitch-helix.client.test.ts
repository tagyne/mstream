import assert from 'node:assert/strict';
import test from 'node:test';
import { TwitchHelixClient } from './twitch-helix.client';

test('Twitch client reports a successful chat send', async () => {
  let request: RequestInit | undefined;
  const client = new TwitchHelixClient({
    baseUrl: 'https://twitch.test',
    fetchImpl: async (_url, init) => {
      request = init;
      return new Response(JSON.stringify({ data: [{ is_sent: true, message_id: 'sent-1' }] }), {
        status: 200,
      });
    },
  });
  assert.deepEqual(
    await client.sendMessage({
      accessToken: 'secret',
      clientId: 'client',
      broadcasterId: '1',
      senderId: '2',
      message: 'hello',
    }),
    { platform: 'twitch', status: 'success', externalId: 'sent-1' },
  );
  assert.equal(request?.method, 'POST');
});

test('Twitch client maps token and rate-limit failures', async () => {
  const client = new TwitchHelixClient({
    fetchImpl: async () => new Response(JSON.stringify({ message: 'nope' }), { status: 401 }),
  });
  assert.equal(
    (await client.updateStream({ accessToken: 'x', clientId: 'y', broadcasterId: '1', title: 'x' }))
      .status,
    'token-expired',
  );
  const limited = new TwitchHelixClient({
    fetchImpl: async () => new Response('', { status: 429 }),
  });
  assert.equal(
    (
      await limited.updateStream({
        accessToken: 'x',
        clientId: 'y',
        broadcasterId: '1',
        title: 'x',
      })
    ).status,
    'rate-limited',
  );
});

test('Twitch client reports a successful stream update', async () => {
  let requestUrl = '';
  let request: RequestInit | undefined;
  const client = new TwitchHelixClient({
    baseUrl: 'https://twitch.test',
    fetchImpl: async (url, init) => {
      requestUrl = String(url);
      request = init;
      return new Response('{}', { status: 200 });
    },
  });
  assert.deepEqual(
    await client.updateStream({
      accessToken: 'secret',
      clientId: 'client',
      broadcasterId: '1',
      title: 'Live',
      gameId: 'game-1',
    }),
    { platform: 'twitch', status: 'success' },
  );
  assert.match(requestUrl, /channels\?broadcaster_id=1/);
  assert.equal(request?.method, 'PATCH');
});

test('Twitch client reads current title and category from channel information', async () => {
  let url = '';
  const client = new TwitchHelixClient({
    baseUrl: 'https://twitch.test',
    fetchImpl: async (requestUrl) => {
      url = String(requestUrl);
      return new Response(
        JSON.stringify({ data: [{ title: 'Live', game_id: '123', game_name: 'Jeux' }] }),
      );
    },
  });
  assert.deepEqual(
    await client.getStream({ accessToken: 'secret', clientId: 'client', broadcasterId: '42' }),
    {
      platform: 'twitch',
      status: 'success',
      title: 'Live',
      categoryId: '123',
      categoryName: 'Jeux',
    },
  );
  assert.equal(url, 'https://twitch.test/channels?broadcaster_id=42');
});

test('Twitch channel read reports expired authorization without exposing credentials', async () => {
  const client = new TwitchHelixClient({
    fetchImpl: async () => new Response(null, { status: 401 }),
  });
  assert.deepEqual(
    await client.getStream({ accessToken: 'secret', clientId: 'client', broadcasterId: '42' }),
    {
      platform: 'twitch',
      status: 'token-expired',
      message: undefined,
    },
  );
});
