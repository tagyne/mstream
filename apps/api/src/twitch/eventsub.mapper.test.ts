import assert from 'node:assert/strict';
import test from 'node:test';
import { TwitchEventSubMapper } from './eventsub.mapper';

test('Twitch EventSub mapper normalizes chat and badges', () => {
  const mapped = new TwitchEventSubMapper().map({
    metadata: {
      message_id: 'event-1',
      message_type: 'notification',
      message_timestamp: '2026-09-26T10:00:00Z',
    },
    payload: {
      subscription: { type: 'channel.chat.message' },
      event: {
        chatter_user_id: '42',
        chatter_user_name: 'viewer',
        message: { text: 'Hello' },
        badges: [{ set_id: 'subscriber', id: '12' }],
      },
    },
  });
  assert.deepEqual(mapped?.message, {
    platform: 'twitch',
    externalId: 'event-1',
    author: { id: '42', name: 'viewer', badges: ['subscriber:12'] },
    content: 'Hello',
    createdAt: '2026-09-26T10:00:00Z',
  });
});

test('Twitch EventSub mapper ignores keepalive and unknown notifications', () => {
  const mapper = new TwitchEventSubMapper();
  assert.equal(
    mapper.map({ metadata: { message_id: 'keep', message_type: 'session_keepalive' } }),
    null,
  );
  assert.equal(
    mapper.map({
      metadata: { message_id: 'unknown', message_type: 'notification' },
      payload: { subscription: { type: 'unknown' }, event: {} },
    }),
    null,
  );
});
