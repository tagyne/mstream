import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { LiveSession } from './live-session/live-session';
import { LiveGateway } from './realtime/live.gateway';
import { TwitchEventSubClient } from './platforms/twitch/eventsub.client';
import { KickWebhookService } from './platforms/kick/webhooks/kick-webhook.service';
import { PlatformCommandService } from './platforms/platform-command.service';
import { TokenVault } from './platform-connections/token-vault';

type Handler = (...args: any[]) => void;
class FakeSocket {
  private readonly handlers = new Map<string, Handler[]>();
  on(event: string, handler: Handler): this { this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]); return this; }
  close(): void { this.emit('close'); }
  emit(event: string, ...args: unknown[]): void { for (const handler of this.handlers.get(event) ?? []) handler(...args); }
  message(value: unknown): void { this.emit('message', Buffer.from(JSON.stringify(value))); }
}

const timestamp = '2026-09-26T10:00:00Z';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

test('local MVP pipeline normalizes Twitch and Kick into the gateway session', () => {
  const session = new LiveSession();
  const gateway = new LiveGateway(session);
  const updates: string[] = [];
  (gateway as unknown as { server: { emit: (event: string, value: { kind?: string }) => void } }).server = { emit: (_event, value) => { if (value.kind) updates.push(value.kind); } };
  const socket = new FakeSocket();
  const twitch = new TwitchEventSubClient(session, undefined, (() => socket) as never);
  twitch.connect();
  socket.message({ metadata: { message_id: 'welcome', message_type: 'session_welcome', message_timestamp: timestamp }, payload: { session: { id: 'session-1' } } });
  socket.message({ metadata: { message_id: 'twitch-message', message_type: 'notification', message_timestamp: timestamp }, payload: { subscription: { type: 'channel.chat.message' }, event: { chatter_user_id: '7', chatter_user_name: 'twitch-viewer', badges: [], message: { text: 'hello twitch' } } } });

  const body = JSON.stringify({ sender: { user_id: 8, username: 'kick-viewer' }, content: 'hello kick', created_at: timestamp });
  const messageId = 'kick-message';
  const signer = createSign('RSA-SHA256');
  signer.update(messageId + '.' + timestamp + '.' + body);
  signer.end();
  const kick = new KickWebhookService(session, publicKey.export({ type: 'spki', format: 'pem' }).toString());
  kick.process(Buffer.from(body), { messageId, messageTimestamp: timestamp, signature: signer.sign(privateKey, 'base64'), eventType: 'chat.message.sent' });
  const eventBody = JSON.stringify({ follower: { username: 'event-viewer' } });
  const eventId = 'kick-follow';
  const eventSigner = createSign('RSA-SHA256');
  eventSigner.update(eventId + '.' + timestamp + '.' + eventBody);
  eventSigner.end();
  kick.process(Buffer.from(eventBody), { messageId: eventId, messageTimestamp: timestamp, signature: eventSigner.sign(privateKey, 'base64'), eventType: 'channel.followed' });

  const client: { emit: (event: string, value: ReturnType<LiveSession['snapshot']>) => void } = { emit: () => undefined };
  gateway.handleConnection(client as never);
  const snapshot = session.snapshot();
  assert.deepEqual(snapshot.messages.map((message) => [message.platform, message.content]), [['twitch', 'hello twitch'], ['kick', 'hello kick']]);
  assert.ok(updates.includes('message'));
  assert.equal(snapshot.messages.length, 2);
  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.statuses.find((status) => status.platform === 'twitch')?.state, 'connected');
  twitch.close();
});

test('local MVP commands report independent send and stream results', async () => {
  const vault = new TokenVault('mvp-e2e-token-secret-32-characters');
  const connection = { platform: 'twitch', externalId: '42', status: 'connected', accessTokenEncrypted: vault.encrypt('twitch-token') };
  const kickConnection = { platform: 'kick', externalId: '99', status: 'connected', accessTokenEncrypted: vault.encrypt('kick-token') };
  const service = new PlatformCommandService(
    { sendMessage: async () => ({ platform: 'twitch', status: 'success' as const }), updateStream: async () => ({ platform: 'twitch', status: 'success' as const }) } as never,
    { sendMessage: async () => ({ platform: 'kick', status: 'network-error' as const, message: 'offline' }), updateStream: async () => ({ platform: 'kick', status: 'success' as const }) } as never,
    { find: async () => [connection, kickConnection] } as never, vault,
  );
  assert.deepEqual(await service.sendForUser('user-1', { message: 'hello', destinations: ['twitch', 'kick'] }), [
    { platform: 'twitch', status: 'success' },
    { platform: 'kick', status: 'network-error', message: 'offline' },
  ]);
  assert.deepEqual(await service.updateStreamForUser('user-1', { title: 'Live', destinations: ['twitch', 'kick'] }), [
    { platform: 'twitch', status: 'success' },
    { platform: 'kick', status: 'success' },
  ]);
});
