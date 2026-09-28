import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import test from 'node:test';
import { LiveSession } from '../live-session/live-session';
import { KickWebhookService } from './kick-webhook.service';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const timestamp = '2026-09-26T10:00:00Z';

function signed(body: string, messageId = '01J kick-message'.replace(' ', '')) {
  const canonical = `${messageId}.${timestamp}.${body}`;
  const signer = createSign('RSA-SHA256');
  signer.update(canonical);
  signer.end();
  return { body: Buffer.from(body), messageId, signature: signer.sign(privateKey, 'base64') };
}

test('Kick webhook accepts a valid signature and normalizes chat', () => {
  const session = new LiveSession();
  const service = new KickWebhookService(
    session,
    publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  );
  const fixture = signed(
    JSON.stringify({
      message_id: 'payload-id',
      sender: { user_id: 42, username: 'viewer' },
      content: 'Hello',
      created_at: timestamp,
    }),
  );

  assert.deepEqual(
    service.process(fixture.body, {
      messageId: fixture.messageId,
      messageTimestamp: timestamp,
      signature: fixture.signature,
      eventType: 'chat.message.sent',
    }),
    { status: 'accepted', kind: 'message' },
  );
  assert.equal(session.snapshot().messages[0]?.content, 'Hello');
});

test('Kick webhook rejects invalid signatures and replays', () => {
  const service = new KickWebhookService(
    new LiveSession(),
    publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  );
  const fixture = signed('{}');
  assert.throws(
    () =>
      service.process(fixture.body, {
        messageId: fixture.messageId,
        messageTimestamp: timestamp,
        signature: 'bad',
      }),
    /Invalid Kick/,
  );
  assert.deepEqual(
    service.process(fixture.body, {
      messageId: fixture.messageId,
      messageTimestamp: timestamp,
      signature: fixture.signature,
      eventType: 'unknown.event',
    }),
    { status: 'ignored' },
  );
  assert.deepEqual(
    service.process(fixture.body, {
      messageId: fixture.messageId,
      messageTimestamp: timestamp,
      signature: fixture.signature,
      eventType: 'unknown.event',
    }),
    { status: 'duplicate' },
  );
});
