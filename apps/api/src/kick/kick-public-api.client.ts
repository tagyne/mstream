import type { OutboundMessageResult, StreamMetadataResult } from '@mstream/contracts';
import { mapHttpFailure } from '../shared/http-result';

export type KickPublicApiClientOptions = { baseUrl?: string; fetchImpl?: typeof fetch };

export class KickPublicApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: KickPublicApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://api.kick.com/public/v1';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async sendMessage(input: {
    accessToken: string;
    broadcasterUserId: number;
    content: string;
  }): Promise<OutboundMessageResult> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: this.headers(input.accessToken),
        body: JSON.stringify({
          broadcaster_user_id: input.broadcasterUserId,
          content: input.content,
        }),
      });
      if (!response.ok)
        return mapHttpFailure('kick', response.status, await this.errorMessage(response));
      const body = (await response.json().catch(() => ({}))) as { message_id?: string };
      return { platform: 'kick', status: 'success', externalId: body.message_id };
    } catch {
      return { platform: 'kick', status: 'network-error', message: 'Kick API request failed' };
    }
  }

  async getStream(accessToken: string): Promise<StreamMetadataResult> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/channels`, {
        headers: this.headers(accessToken),
      });
      if (!response.ok)
        return mapHttpFailure('kick', response.status, await this.errorMessage(response));
      const body = (await response.json()) as {
        data?: Array<{
          stream_title?: unknown;
          category?: { id?: unknown; name?: unknown } | null;
        }>;
      };
      const channel = body.data?.[0];
      if (typeof channel?.stream_title !== 'string')
        return {
          platform: 'kick',
          status: 'rejected',
          message: 'Kick channel data is unavailable',
        };
      const category = channel.category;
      if (category && (typeof category.id !== 'number' || typeof category.name !== 'string'))
        return {
          platform: 'kick',
          status: 'rejected',
          message: 'Kick category data is unavailable',
        };
      return {
        platform: 'kick',
        status: 'success',
        title: channel.stream_title,
        categoryId: category ? String(category.id) : '',
        categoryName: category && typeof category.name === 'string' ? category.name : '',
      };
    } catch {
      return { platform: 'kick', status: 'network-error', message: 'Kick API request failed' };
    }
  }

  async updateStream(input: {
    accessToken: string;
    categoryId?: number;
    title?: string;
  }): Promise<OutboundMessageResult> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/channels`, {
        method: 'PATCH',
        headers: this.headers(input.accessToken),
        body: JSON.stringify({
          ...(input.categoryId === undefined ? {} : { category_id: input.categoryId }),
          ...(input.title === undefined ? {} : { stream_title: input.title }),
        }),
      });
      return response.ok
        ? { platform: 'kick', status: 'success' }
        : mapHttpFailure('kick', response.status, await this.errorMessage(response));
    } catch {
      return { platform: 'kick', status: 'network-error', message: 'Kick API request failed' };
    }
  }

  async searchCategories(accessToken: string, query: string): Promise<unknown[]> {
    const params = new URLSearchParams({ name: query });
    const response = await this.fetchImpl(`https://api.kick.com/public/v2/categories?${params}`, {
      headers: this.headers(accessToken),
    });
    if (!response.ok) throw new Error(`Kick categories request failed with ${response.status}`);
    const body = (await response.json()) as { data?: unknown[] };
    return body.data ?? [];
  }

  private headers(accessToken: string): Record<string, string> {
    return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  }

  private async errorMessage(response: Response): Promise<string | undefined> {
    try {
      return ((await response.json()) as { message?: string }).message;
    } catch {
      return undefined;
    }
  }
}
