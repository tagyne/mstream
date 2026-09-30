import assert from 'node:assert/strict';
import test from 'node:test';
import { KickPublicApiClient } from './kick-public-api.client';

test('Kick client sends chat with independent result mapping', async () => {
  let url = '';
  const client = new KickPublicApiClient({
    baseUrl: 'https://kick.test/public/v1',
    fetchImpl: async (requestUrl) => {
      url = String(requestUrl);
      return new Response(JSON.stringify({ message_id: 'kick-1' }), { status: 200 });
    },
  });
  assert.deepEqual(
    await client.sendMessage({ accessToken: 'secret', broadcasterUserId: 42, content: 'hello' }),
    { platform: 'kick', status: 'success', externalId: 'kick-1' },
  );
  assert.equal(url, 'https://kick.test/public/v1/chat');
});

test('Kick category search normalizes Categories V2 results', async () => {
  let url = '';
  const client = new KickPublicApiClient({
    fetchImpl: async (requestUrl) => {
      url = String(requestUrl);
      return new Response(
        JSON.stringify({
          data: [{ id: 1, name: 'Just Chatting', thumbnail: 'https://img.test/category.jpg' }],
        }),
        { status: 200 },
      );
    },
  });
  assert.deepEqual(await client.searchCategories('secret', 'games'), [
    { id: '1', name: 'Just Chatting', imageUrl: 'https://img.test/category.jpg' },
  ]);
  assert.match(url, /https:\/\/api\.kick\.com\/public\/v2\/categories/);
  assert.equal(new URL(url).searchParams.get('name'), 'games');
});

test('Kick client reads current title and category from authenticated channel', async () => {
  let url = '';
  const client = new KickPublicApiClient({
    baseUrl: 'https://kick.test/public/v1',
    fetchImpl: async (requestUrl) => {
      url = String(requestUrl);
      return new Response(
        JSON.stringify({
          data: [
            {
              stream_title: 'Kick live',
              category: { id: 77, name: 'Art', thumbnail: 'https://img.test/art.jpg' },
            },
          ],
        }),
      );
    },
  });
  assert.deepEqual(await client.getStream('secret'), {
    platform: 'kick',
    status: 'success',
    title: 'Kick live',
    categoryId: '77',
    categoryName: 'Art',
    categoryImageUrl: 'https://img.test/art.jpg',
  });
  assert.equal(url, 'https://kick.test/public/v1/channels');
});

test('Kick channel read rejects malformed channel data', async () => {
  const client = new KickPublicApiClient({
    fetchImpl: async () => new Response(JSON.stringify({ data: [{}] })),
  });
  assert.deepEqual(await client.getStream('secret'), {
    platform: 'kick',
    status: 'rejected',
    message: 'Kick channel data is unavailable',
  });
});
