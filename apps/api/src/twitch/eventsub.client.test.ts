import assert from 'node:assert/strict';
import test from 'node:test';
import { LiveSession } from '../live-session/live-session';
import { TwitchEventSubMapper } from './eventsub.mapper';
import { TwitchEventSubClient } from './eventsub.client';
import { TwitchEventSubSubscriptionManager } from './eventsub-subscriptions';

type Handler = (...args: unknown[]) => void;
class FakeSocket {
  handlers = new Map<string, Handler[]>();
  on(event: string, handler: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }
  close() {
    this.emit('close');
  }
  emit(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) handler(...args);
  }
  message(value: unknown) {
    this.emit('message', Buffer.from(JSON.stringify(value)));
  }
}
const welcome = (id: string, messageId: string) => ({
  metadata: {
    message_id: messageId,
    message_type: 'session_welcome',
    message_timestamp: '2026-09-26T10:00:00Z',
  },
  payload: { session: { id } },
});

test('EventSub reconnects after close and deduplicates notifications across sockets', async () => {
  const sockets: FakeSocket[] = [];
  const session = new LiveSession();
  const client = new TwitchEventSubClient(
    session,
    undefined,
    (() => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    }) as never,
    { reconnectDelayMs: 0 },
  );
  client.connect();
  sockets[0].message(welcome('session-1', 'welcome-1'));
  sockets[0].emit('close');
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(sockets.length, 2);
  sockets[1].message(welcome('session-2', 'welcome-2'));
  assert.ok(
    new TwitchEventSubMapper().map({
      metadata: {
        message_id: 'check',
        message_type: 'notification',
        message_timestamp: '2026-09-26T10:00:00Z',
      },
      payload: {
        subscription: { type: 'channel.chat.message' },
        event: { chatter_user_name: 'a', message: { text: 'x' } },
      },
    }),
  );
  sockets[0].message({
    metadata: {
      message_id: 'duplicate',
      message_type: 'notification',
      message_timestamp: '2026-09-26T10:00:00Z',
    },
    payload: {
      subscription: { type: 'channel.chat.message' },
      event: { chatter_user_name: 'a', message: { text: 'x' } },
    },
  });
  sockets[1].message({
    metadata: {
      message_id: 'duplicate',
      message_type: 'notification',
      message_timestamp: '2026-09-26T10:00:00Z',
    },
    payload: {
      subscription: { type: 'channel.chat.message' },
      event: { chatter_user_name: 'a', message: { text: 'x' } },
    },
  });
  assert.equal(session.snapshot().messages.length, 1);
  client.close();
});

test('Subscription manager recreates every configured subscription on welcome', async () => {
  const calls: string[] = [];
  const sockets: FakeSocket[] = [];
  const session = new LiveSession();
  const client = new TwitchEventSubClient(session, undefined, (() => {
    const socket = new FakeSocket();
    sockets.push(socket);
    return socket;
  }) as never);
  const manager = new TwitchEventSubSubscriptionManager(
    client,
    'token',
    'client',
    [
      {
        type: 'channel.follow',
        version: '2',
        condition: { broadcaster_user_id: '1', moderator_user_id: '1' },
      },
    ],
    async (url) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    },
  );
  manager.start();
  client.connect();
  sockets[0].message(welcome('session', 'welcome'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 1);
  manager.stop();
  client.close();
});

test('Subscription failures identify rejected types without terminating the welcome handler', async () => {
  const sockets: FakeSocket[] = [];
  const session = new LiveSession();
  const client = new TwitchEventSubClient(session, undefined, (() => {
    const socket = new FakeSocket();
    sockets.push(socket);
    return socket;
  }) as never);
  const manager = new TwitchEventSubSubscriptionManager(
    client,
    'token',
    'client',
    [
      { type: 'channel.chat.message', version: '1', condition: { broadcaster_user_id: '1' } },
      { type: 'channel.subscription.gift', version: '1', condition: { broadcaster_user_id: '1' } },
    ],
    async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { type: string };
      return new Response(null, {
        status: body.type === 'channel.subscription.gift' ? 403 : 202,
      });
    },
  );
  await assert.rejects(manager.resubscribe('session'), /channel\.subscription\.gift: HTTP 403/);
  manager.start();
  client.connect();
  sockets[0].message(welcome('session', 'welcome-error'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.snapshot().statuses[0]?.state, 'connected');
  manager.stop();
  client.close();
});
