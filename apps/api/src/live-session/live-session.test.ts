import assert from 'node:assert/strict';
import test from 'node:test';
import type { UnifiedMessage } from '@mstream/contracts';
import { LiveSession } from './live-session';

const message: UnifiedMessage = {
  platform: 'twitch',
  externalId: 'message-1',
  author: { name: 'streamer', badges: [] },
  content: 'Bonjour',
  createdAt: '2026-09-26T10:00:00.000Z',
};

test('deduplicates messages by platform and external id', () => {
  const session = new LiveSession();

  assert.equal(session.addMessage(message), true);
  assert.equal(session.addMessage(message), false);
  assert.deepEqual(session.snapshot().messages, [message]);
});

test('clears all in-memory data when the session ends', () => {
  const session = new LiveSession();
  session.addMessage(message);
  session.clear();

  assert.deepEqual(session.snapshot(), { messages: [], events: [], statuses: [] });
});
