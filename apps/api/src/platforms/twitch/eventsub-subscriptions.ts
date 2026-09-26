import type { TwitchEventSubClient } from './eventsub.client';

export type TwitchSubscriptionSpec = { type: string; version: string; condition: Record<string, string> };

type SubscriptionResponse = { data?: unknown[] };

export class TwitchEventSubSubscriptionManager {
  private unsubscribe?: () => void;

  constructor(
    private readonly client: TwitchEventSubClient,
    private readonly accessToken: string,
    private readonly clientId: string,
    private readonly subscriptions: TwitchSubscriptionSpec[],
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  start(): void {
    this.unsubscribe = this.client.onSessionWelcome((sessionId) => this.resubscribe(sessionId));
  }

  stop(): void { this.unsubscribe?.(); this.unsubscribe = undefined; }

  async resubscribe(sessionId: string): Promise<void> {
    await Promise.all(this.subscriptions.map(async (subscription) => {
      const response = await this.fetchImpl('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${this.accessToken}`, 'Client-Id': this.clientId, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: subscription.type, version: subscription.version, condition: subscription.condition, transport: { method: 'websocket', session_id: sessionId } }),
      });
      if (!response.ok) throw new Error(`Twitch EventSub subscription failed with ${response.status}`);
      await response.json() as Promise<SubscriptionResponse>;
    }));
  }
}
