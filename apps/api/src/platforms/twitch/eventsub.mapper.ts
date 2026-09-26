import type { UnifiedEvent, UnifiedMessage } from '@mstream/contracts';

type EventSubEnvelope = {
  metadata?: { message_id?: string; message_type?: string; message_timestamp?: string; subscription_type?: string };
  payload?: { subscription?: { type?: string }; event?: Record<string, unknown>; session?: { id?: string; reconnect_url?: string | null; keepalive_timeout_seconds?: number | null } };
};

export type TwitchEventSubMapping = { message?: UnifiedMessage; event?: UnifiedEvent };

const EVENT_TYPES: Record<string, UnifiedEvent['type']> = {
  'channel.follow': 'follow',
  'channel.subscribe': 'subscription',
  'channel.subscription.gift': 'gift',
  'channel.cheer': 'cheer',
  'channel.chat.notification': 'subscription',
  'channel.update': 'stream-update',
};

export class TwitchEventSubMapper {
  map(envelope: EventSubEnvelope): TwitchEventSubMapping | null {
    if (envelope.metadata?.message_type !== 'notification') return null;
    const event = envelope.payload?.event;
    const subscriptionType = envelope.payload?.subscription?.type ?? envelope.metadata.subscription_type;
    const externalId = envelope.metadata.message_id;
    const createdAt = envelope.metadata.message_timestamp;
    if (!event || !subscriptionType || !externalId || !createdAt) return null;

    if (subscriptionType === 'channel.chat.message') {
      const message = this.mapMessage(event, externalId, createdAt);
      return message ? { message } : null;
    }

    const type = EVENT_TYPES[subscriptionType];
    if (!type) return null;
    return {
      event: {
        platform: 'twitch',
        type,
        externalId,
        actor: this.stringValue(event.user_name) ?? this.stringValue(event.user_login),
        metadata: event,
        createdAt,
      },
    };
  }

  private mapMessage(event: Record<string, unknown>, externalId: string, createdAt: string): UnifiedMessage | null {
    const message = this.asRecord(event.message);
    const author = this.stringValue(event.chatter_user_name);
    const content = message ? this.stringValue(message.text) : undefined;
    if (!author || content === undefined) return null;
    const badges = Array.isArray(event.badges)
      ? event.badges.flatMap((badge) => {
          const value = this.asRecord(badge);
          const setId = value ? this.stringValue(value.set_id) : undefined;
          const id = value ? this.stringValue(value.id) : undefined;
          return setId && id ? [`${setId}:${id}`] : [];
        })
      : [];
    return {
      platform: 'twitch',
      externalId,
      author: { id: this.stringValue(event.chatter_user_id), name: author, badges },
      content,
      createdAt,
    };
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  }
}
