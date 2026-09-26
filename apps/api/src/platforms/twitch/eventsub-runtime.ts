import { Injectable } from '@nestjs/common';
import { TwitchEventSubClient } from './eventsub.client';
import { TwitchEventSubSubscriptionManager, type TwitchSubscriptionSpec } from './eventsub-subscriptions';

@Injectable()
export class TwitchEventSubRuntime {
  private manager?: TwitchEventSubSubscriptionManager;

  constructor(private readonly client: TwitchEventSubClient) {}

  start(accessToken: string, clientId: string, broadcasterId: string, fetchImpl: typeof fetch = fetch): void {
    this.stop();
    const subscriptions: TwitchSubscriptionSpec[] = [
      { type: 'channel.chat.message', version: '1', condition: { broadcaster_user_id: broadcasterId, user_id: broadcasterId } },
      { type: 'channel.chat.notification', version: '1', condition: { broadcaster_user_id: broadcasterId, user_id: broadcasterId } },
      { type: 'channel.follow', version: '2', condition: { broadcaster_user_id: broadcasterId, moderator_user_id: broadcasterId } },
      { type: 'channel.subscribe', version: '1', condition: { broadcaster_user_id: broadcasterId } },
      { type: 'channel.subscription.gift', version: '1', condition: { broadcaster_user_id: broadcasterId } },
      { type: 'channel.cheer', version: '1', condition: { broadcaster_user_id: broadcasterId } },
      { type: 'channel.update', version: '2', condition: { broadcaster_user_id: broadcasterId } },
    ];
    this.manager = new TwitchEventSubSubscriptionManager(this.client, accessToken, clientId, subscriptions, fetchImpl);
    this.manager.start();
    this.client.connect();
  }

  stop(): void {
    this.manager?.stop();
    this.manager = undefined;
    this.client.close();
  }
}
