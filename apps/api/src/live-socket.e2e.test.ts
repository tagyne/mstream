import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { io, type Socket } from 'socket.io-client';
import test from 'node:test';
import type { LiveSessionSnapshot, LiveSessionUpdate } from '@mstream/contracts';
import { LiveSession } from './live-session/live-session';
import { LiveSessionModule } from './live-session/live-session.module';
import { LiveGateway } from './realtime/live.gateway';
import { TwitchEventSubClient } from './platforms/twitch/eventsub.client';

@Module({ imports: [LiveSessionModule], providers: [LiveGateway] })
class LiveSocketTestModule {}

type EventHandler = (...args: any[]) => void;
class FakeEventSubSocket {
  private readonly handlers = new Map<string, EventHandler[]>();
  on(event: string, handler: EventHandler): this { this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]); return this; }
  close(): void { this.emit('close'); }
  emit(event: string, ...args: unknown[]): void { for (const handler of this.handlers.get(event) ?? []) handler(...args); }
  message(value: unknown): void { this.emit('message', Buffer.from(JSON.stringify(value))); }
}

function waitFor<T>(register: (resolve: (value: T) => void, reject: (error: Error) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket.IO test timed out')), 3000);
    register((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

test('Socket.IO publishes a session snapshot and live updates over the network', async () => {
  const app = await NestFactory.create(LiveSocketTestModule, { logger: false });
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address() as { port: number };
  const client: Socket = io(`http://127.0.0.1:${address.port}/live`, { autoConnect: false, transports: ['websocket'] });
  try {
    const snapshotPromise = waitFor<LiveSessionSnapshot>((resolve, reject) => {
      client.once('connect_error', reject);
      client.once('live.snapshot', resolve);
      client.connect();
    });
    const snapshot = await snapshotPromise;
    assert.deepEqual(snapshot.messages, []);
    const eventSubSocket = new FakeEventSubSocket();
    const eventSub = new TwitchEventSubClient(app.get(LiveSession), undefined, (() => eventSubSocket) as never);
    eventSub.connect();
    eventSubSocket.message({ metadata: { message_id: 'eventsub-welcome', message_type: 'session_welcome', message_timestamp: '2026-09-26T10:00:00Z' }, payload: { session: { id: 'session-1' } } });
    const updatePromise = waitFor<LiveSessionUpdate>((resolve) => client.on('live.update', (update) => { if (update.kind === 'message') resolve(update); }));
    eventSubSocket.message({ metadata: { message_id: 'socket-message', message_type: 'notification', message_timestamp: '2026-09-26T10:00:00Z' }, payload: { subscription: { type: 'channel.chat.message' }, event: { chatter_user_id: '7', chatter_user_name: 'viewer', badges: [], message: { text: 'network hello' } } } });
    const update = await updatePromise;
    assert.equal(update.kind, 'message');
    if (update.kind === 'message') assert.equal(update.value.content, 'network hello');
  } finally {
    client.close();
    await app.close();
  }
});
