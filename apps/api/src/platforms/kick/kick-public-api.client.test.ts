import assert from 'node:assert/strict';
import test from 'node:test';
import { KickPublicApiClient } from './kick-public-api.client';

test('Kick client sends chat with independent result mapping', async () => {
  let url = '';
  const client = new KickPublicApiClient({ baseUrl: 'https://kick.test/public/v1', fetchImpl: async (requestUrl) => { url = String(requestUrl); return new Response(JSON.stringify({ message_id: 'kick-1' }), { status: 200 }); } });
  assert.deepEqual(await client.sendMessage({ accessToken: 'secret', broadcasterUserId: 42, content: 'hello' }), { platform: 'kick', status: 'success', externalId: 'kick-1' });
  assert.equal(url, 'https://kick.test/public/v1/chat');
});

test('Kick client uses Categories V2 for searches', async () => {
  let url = '';
  const client = new KickPublicApiClient({ fetchImpl: async (requestUrl) => { url = String(requestUrl); return new Response(JSON.stringify({ data: [{ id: 1 }] }), { status: 200 }); } });
  assert.deepEqual(await client.searchCategories('secret', 'games'), [{ id: 1 }]);
  assert.match(url, /public%2Fv2|public\/v2/);
});
