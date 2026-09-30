import { Logger } from '@nestjs/common';
import type { TwitchEventSubClient } from './eventsub.client';

export type TwitchSubscriptionSpec = {
  type: string;
  version: string;
  condition: Record<string, string>;
};

export class TwitchEventSubSubscriptionManager {
  private readonly logger = new Logger(TwitchEventSubSubscriptionManager.name);
  private unsubscribe?: () => void;

  constructor(
    private readonly client: TwitchEventSubClient,
    private readonly accessToken: string,
    private readonly clientId: string,
    private readonly subscriptions: TwitchSubscriptionSpec[],
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  start(): void {
    this.unsubscribe = this.client.onSessionWelcome((sessionId) => {
      void this.resubscribe(sessionId).catch((error: unknown) => this.logger.error(error));
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  async resubscribe(sessionId: string): Promise<void> {
    const results = await Promise.allSettled(
      this.subscriptions.map(async (subscription) => {
        const response = await this.fetchImpl(
          'https://api.twitch.tv/helix/eventsub/subscriptions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Client-Id': this.clientId,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: subscription.type,
              version: subscription.version,
              condition: subscription.condition,
              transport: { method: 'websocket', session_id: sessionId },
            }),
          },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }),
    );
    const failures = results.flatMap((result, index) =>
      result.status === 'rejected'
        ? [
            `${this.subscriptions[index].type}: ${result.reason instanceof Error ? result.reason.message : 'request failed'}`,
          ]
        : [],
    );
    if (failures.length)
      throw new Error(`Twitch EventSub subscriptions failed: ${failures.join('; ')}`);
  }
}
