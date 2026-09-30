import type {
  OutboundMessageResult,
  StreamCategory,
  StreamMetadataResult,
} from '@mstream/contracts';
import { mapHttpFailure } from '../shared/http-result';
import { secureImageUrl } from '../shared/secure-image-url';

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

  async sendMessage(input: {
    accessToken: string;
    clientId: string;
    broadcasterId: string;
    senderId: string;
    message: string;
  }): Promise<OutboundMessageResult> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/chat/messages`, {
        method: 'POST',
        headers: this.headers(input.accessToken, input.clientId),
        body: JSON.stringify({
          broadcaster_id: input.broadcasterId,
          sender_id: input.senderId,
          message: input.message,
        }),
      });
      if (!response.ok)
        return mapHttpFailure('twitch', response.status, await this.errorMessage(response));
      const body = (await response.json()) as {
        data?: Array<{
          message_id?: string;
          is_sent?: boolean;
          drop_reason?: { message?: string };
        }>;
      };
      const result = body.data?.[0];
      if (!result?.is_sent)
        return { platform: 'twitch', status: 'rejected', message: result?.drop_reason?.message };
      return { platform: 'twitch', status: 'success', externalId: result.message_id };
    } catch {
      return { platform: 'twitch', status: 'network-error', message: 'Twitch API request failed' };
    }
  }

  async getStream(input: {
    accessToken: string;
    clientId: string;
    broadcasterId: string;
  }): Promise<StreamMetadataResult> {
    const query = new URLSearchParams({ broadcaster_id: input.broadcasterId });
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/channels?${query}`, {
        headers: this.headers(input.accessToken, input.clientId),
      });
      if (!response.ok)
        return mapHttpFailure('twitch', response.status, await this.errorMessage(response));
      const body = (await response.json()) as {
        data?: Array<{ title?: unknown; game_id?: unknown; game_name?: unknown }>;
      };
      const channel = body.data?.[0];
      if (
        typeof channel?.title !== 'string' ||
        typeof channel.game_id !== 'string' ||
        typeof channel.game_name !== 'string'
      )
        return {
          platform: 'twitch',
          status: 'rejected',
          message: 'Twitch channel data is unavailable',
        };
      return {
        platform: 'twitch',
        status: 'success',
        title: channel.title,
        categoryId: channel.game_id,
        categoryName: channel.game_name,
      };
    } catch {
      return { platform: 'twitch', status: 'network-error', message: 'Twitch API request failed' };
    }
  }

  async searchCategories(input: {
    accessToken: string;
    clientId: string;
    query: string;
  }): Promise<StreamCategory[]> {
    const params = new URLSearchParams({ query: input.query, first: '20' });
    const response = await this.fetchImpl(`${this.baseUrl}/search/categories?${params}`, {
      headers: this.headers(input.accessToken, input.clientId),
    });
    if (!response.ok) throw new Error(`Twitch category search failed with ${response.status}`);
    const body = (await response.json()) as {
      data?: Array<{ id?: unknown; name?: unknown; box_art_url?: unknown }>;
    };
    return (body.data ?? []).flatMap((category) => {
      if (
        typeof category.id !== 'string' ||
        !category.id ||
        typeof category.name !== 'string' ||
        !category.name.trim() ||
        typeof category.box_art_url !== 'string'
      )
        return [];
      const imageUrl = secureImageUrl(
        category.box_art_url.replace('{width}', '52').replace('{height}', '72'),
      );
      return imageUrl ? [{ id: category.id, name: category.name, imageUrl }] : [];
    });
  }

  async updateStream(input: {
    accessToken: string;
    clientId: string;
    broadcasterId: string;
    title?: string;
    gameId?: string;
  }): Promise<OutboundMessageResult> {
    const query = new URLSearchParams({ broadcaster_id: input.broadcasterId });
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/channels?${query}`, {
        method: 'PATCH',
        headers: this.headers(input.accessToken, input.clientId),
        body: JSON.stringify({
          ...(input.title === undefined ? {} : { title: input.title }),
          ...(input.gameId === undefined ? {} : { game_id: input.gameId }),
        }),
      });
      return response.ok
        ? { platform: 'twitch', status: 'success' }
        : mapHttpFailure('twitch', response.status, await this.errorMessage(response));
    } catch {
      return { platform: 'twitch', status: 'network-error', message: 'Twitch API request failed' };
    }
  }

  private headers(accessToken: string, clientId: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': clientId,
      'Content-Type': 'application/json',
    };
  }

  private async errorMessage(response: Response): Promise<string | undefined> {
    try {
      return ((await response.json()) as { message?: string }).message;
    } catch {
      return undefined;
    }
  }
}
