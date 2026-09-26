import type { OutboundMessageResult } from '@mstream/contracts';
import { mapHttpFailure } from '../shared/http-result';

export type TwitchHelixClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export class TwitchHelixClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TwitchHelixClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://api.twitch.tv/helix';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async sendMessage(input: { accessToken: string; clientId: string; broadcasterId: string; senderId: string; message: string }): Promise<OutboundMessageResult> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/chat/messages`, {
        method: 'POST', headers: this.headers(input.accessToken, input.clientId),
        body: JSON.stringify({ broadcaster_id: input.broadcasterId, sender_id: input.senderId, message: input.message }),
      });
      if (!response.ok) return mapHttpFailure('twitch', response.status, await this.errorMessage(response));
      const body = await response.json() as { data?: Array<{ message_id?: string; is_sent?: boolean; drop_reason?: { message?: string } }> };
      const result = body.data?.[0];
      if (!result?.is_sent) return { platform: 'twitch', status: 'rejected', message: result?.drop_reason?.message };
      return { platform: 'twitch', status: 'success', externalId: result.message_id };
    } catch {
      return { platform: 'twitch', status: 'network-error', message: 'Twitch API request failed' };
    }
  }

  async updateStream(input: { accessToken: string; clientId: string; broadcasterId: string; title?: string; gameId?: string }): Promise<OutboundMessageResult> {
    const query = new URLSearchParams({ broadcaster_id: input.broadcasterId });
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/channels?${query}`, {
        method: 'PATCH', headers: this.headers(input.accessToken, input.clientId),
        body: JSON.stringify({ ...(input.title === undefined ? {} : { title: input.title }), ...(input.gameId === undefined ? {} : { game_id: input.gameId }) }),
      });
      return response.ok ? { platform: 'twitch', status: 'success' } : mapHttpFailure('twitch', response.status, await this.errorMessage(response));
    } catch {
      return { platform: 'twitch', status: 'network-error', message: 'Twitch API request failed' };
    }
  }

  private headers(accessToken: string, clientId: string): Record<string, string> {
    return { Authorization: `Bearer ${accessToken}`, 'Client-Id': clientId, 'Content-Type': 'application/json' };
  }

  private async errorMessage(response: Response): Promise<string | undefined> {
    try { return (await response.json() as { message?: string }).message; } catch { return undefined; }
  }
}
