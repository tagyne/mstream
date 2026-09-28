import assert from 'node:assert/strict';
import test from 'node:test';
import type { UnifiedMessage } from '@mstream/contracts';
import { LiveSession } from '../live-session/live-session';

test('LiveSession subscriptions receive normalized updates for Socket.IO gateways', () => {
  const session = new LiveSession();
  const updates: string[] = [];
  const unsubscribe = session.subscribe((update) => updates.push(update.kind));
  const message: UnifiedMessage = {
    platform: 'twitch',
    externalId: '1',
    author: { name: 'a', badges: [] },
    content: 'hi',
    createdAt: new Date().toISOString(),
  };
  session.addMessage(message);
  session.setStatus({ platform: 'kick', state: 'connected', updatedAt: new Date().toISOString() });
  unsubscribe();
  session.addMessage({ ...message, externalId: '2' });
  assert.deepEqual(updates, ['message', 'status']);
});
