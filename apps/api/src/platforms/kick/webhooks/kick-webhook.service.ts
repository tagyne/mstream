import { createVerify } from 'node:crypto';
import { Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import type { UnifiedEvent, UnifiedMessage } from '@mstream/contracts';
import { LiveSession } from '../../../live-session/live-session';

export type KickWebhookHeaders = {
  messageId?: string;
  messageTimestamp?: string;
  signature?: string;
  eventType?: string;
  eventVersion?: string;
};

export type KickWebhookResult =
  | { status: 'accepted'; kind: 'message' | 'event' }
  | { status: 'duplicate' | 'ignored' };

const EVENT_TYPES: Record<string, UnifiedEvent['type']> = {
  'channel.followed': 'follow',
  'channel.subscription.new': 'subscription',
  'channel.subscription.renewal': 'subscription',
  'channel.subscription.gifts': 'gift',
  'kicks.gifted': 'kick',
  'livestream.status.updated': 'stream-update',
  'livestream.metadata.updated': 'stream-update',
};

@Injectable()
export class KickWebhookService {
  private readonly processedIds = new Set<string>();

  constructor(
    private readonly session: LiveSession,
    @Optional() private readonly publicKey: string = process.env.KICK_WEBHOOK_PUBLIC_KEY ?? '',
  ) {}

  process(rawBody: Buffer, headers: KickWebhookHeaders): KickWebhookResult {
    const messageId = headers.messageId;
    if (!messageId || !headers.messageTimestamp || !headers.signature) {
      throw new UnauthorizedException('Missing Kick webhook security headers');
    }
    if (!this.verifySignature(rawBody, headers)) {
      throw new UnauthorizedException('Invalid Kick webhook signature');
    }
    if (this.processedIds.has(messageId)) return { status: 'duplicate' };
    this.processedIds.add(messageId);

    const payload = this.parsePayload(rawBody);
    if (headers.eventType === 'chat.message.sent') {
      const message = this.mapMessage(payload, messageId);
      if (message) {
        this.session.addMessage(message);
        return { status: 'accepted', kind: 'message' };
      }
      return { status: 'ignored' };
    }

    const eventType = headers.eventType ? EVENT_TYPES[headers.eventType] : undefined;
    if (!eventType) return { status: 'ignored' };
    this.session.addEvent({
      platform: 'kick',
      type: eventType,
      externalId: messageId,
      actor: this.actorName(payload),
      metadata: payload,
      createdAt: headers.messageTimestamp,
    });
    return { status: 'accepted', kind: 'event' };
  }

  private verifySignature(rawBody: Buffer, headers: KickWebhookHeaders): boolean {
    if (!this.publicKey) return false;
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${headers.messageId}.${headers.messageTimestamp}.${rawBody.toString('utf8')}`);
    verifier.end();
    try {
      return verifier.verify(this.publicKey, headers.signature! , 'base64');
    } catch {
      return false;
    }
  }

  private parsePayload(rawBody: Buffer): Record<string, unknown> {
    try {
      const value: unknown = JSON.parse(rawBody.toString('utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      return value as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('Invalid Kick webhook JSON payload');
    }
  }

  private mapMessage(payload: Record<string, unknown>, externalId: string): UnifiedMessage | null {
    const sender = this.asRecord(payload.sender);
    const content = typeof payload.content === 'string' ? payload.content : null;
    const name = sender && typeof sender.username === 'string' ? sender.username : null;
    if (!content || !name) return null;
    return {
      platform: 'kick',
      externalId,
      author: {
        id: sender && typeof sender.user_id === 'number' ? String(sender.user_id) : undefined,
        name,
        badges: [],
      },
      content,
      createdAt: typeof payload.created_at === 'string' ? payload.created_at : new Date().toISOString(),
    };
  }

  private actorName(payload: Record<string, unknown>): string | undefined {
    for (const key of ['follower', 'subscriber', 'gifter', 'sender', 'moderator']) {
      const actor = this.asRecord(payload[key]);
      if (actor && typeof actor.username === 'string') return actor.username;
    }
    return undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }
}
