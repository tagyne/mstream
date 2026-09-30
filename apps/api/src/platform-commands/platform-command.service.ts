import { Injectable } from '@nestjs/common';
import type {
  OutboundMessageResult,
  Platform,
  StreamCategorySearchResult,
  StreamMetadataResult,
} from '@mstream/contracts';
import { PlatformAccountTokenService } from '../better-auth/platform-account-token.service';
import { KickPublicApiClient } from '../kick/kick-public-api.client';
import { TwitchHelixClient } from '../twitch/twitch-helix.client';

type TwitchMessageInput = {
  accessToken: string;
  clientId: string;
  broadcasterId: string;
  senderId: string;
};
type KickMessageInput = { accessToken: string; broadcasterUserId: number };
type SendMessageInput = {
  message: string;
  destinations: Platform[];
  twitch?: TwitchMessageInput;
  kick?: KickMessageInput;
};

@Injectable()
export class PlatformCommandService {
  constructor(
    private readonly twitch: TwitchHelixClient,
    private readonly kick: KickPublicApiClient,
    private readonly accounts: PlatformAccountTokenService,
  ) {}

  async sendMessage(input: SendMessageInput): Promise<OutboundMessageResult[]> {
    return Promise.all(
      input.destinations.map(async (platform) => {
        try {
          if (platform === 'twitch' && input.twitch)
            return this.twitch.sendMessage({ ...input.twitch, message: input.message });
          if (platform === 'kick' && input.kick)
            return this.kick.sendMessage({ ...input.kick, content: input.message });
          return {
            platform,
            status: 'rejected' as const,
            message: 'Platform credentials are unavailable',
          };
        } catch {
          return {
            platform,
            status: 'network-error' as const,
            message: `${platform} command failed`,
          };
        }
      }),
    );
  }

  async getStreamForUser(userId: string): Promise<StreamMetadataResult[]> {
    return Promise.all(
      (['twitch', 'kick'] as const).map(async (platform) => {
        try {
          const account = await this.accounts.getForUser(userId, platform);
          if (!account)
            return {
              platform,
              status: 'rejected' as const,
              message: `${platform} is not connected`,
            };
          if (platform === 'kick') {
            const stream = await this.kick.getStream(account.accessToken);
            if (
              stream.status !== 'success' ||
              stream.categoryImageUrl ||
              !stream.categoryId ||
              !stream.categoryName
            )
              return stream;
            try {
              const categories = await this.kick.searchCategories(
                account.accessToken,
                stream.categoryName,
              );
              const category = categories.find((item) => item.id === stream.categoryId);
              return category ? { ...stream, categoryImageUrl: category.imageUrl } : stream;
            } catch {
              return stream;
            }
          }
          const clientId = process.env.TWITCH_CLIENT_ID ?? '';
          const stream = await this.twitch.getStream({
            accessToken: account.accessToken,
            clientId,
            broadcasterId: account.externalId,
          });
          if (stream.status !== 'success' || !stream.categoryId || !stream.categoryName)
            return stream;
          try {
            const categories = await this.twitch.searchCategories({
              accessToken: account.accessToken,
              clientId,
              query: stream.categoryName,
            });
            const category = categories.find((item) => item.id === stream.categoryId);
            return category ? { ...stream, categoryImageUrl: category.imageUrl } : stream;
          } catch {
            return stream;
          }
        } catch {
          return {
            platform,
            status: 'rejected' as const,
            message: `${platform} connection could not be used`,
          };
        }
      }),
    );
  }

  async searchCategoriesForUser(
    userId: string,
    platform: Platform,
    query: string,
  ): Promise<StreamCategorySearchResult> {
    try {
      const account = await this.accounts.getForUser(userId, platform);
      if (!account) {
        const platformName = platform === 'twitch' ? 'Twitch' : 'Kick';
        return { platform, categories: [], message: `${platformName} n’est pas connectée.` };
      }
      const normalizedQuery = query.trim();
      const categories =
        platform === 'twitch'
          ? await this.twitch.searchCategories({
              accessToken: account.accessToken,
              clientId: process.env.TWITCH_CLIENT_ID ?? '',
              query: normalizedQuery,
            })
          : await this.kick.searchCategories(account.accessToken, normalizedQuery);
      return { platform, categories };
    } catch {
      const platformName = platform === 'twitch' ? 'Twitch' : 'Kick';
      return {
        platform,
        categories: [],
        message: `La recherche de catégories ${platformName} a échoué.`,
      };
    }
  }

  async updateStreamForUser(
    userId: string,
    input: { title?: string; categoryId?: string; destinations: Platform[] },
  ): Promise<OutboundMessageResult[]> {
    return Promise.all(
      input.destinations.map(async (platform) => {
        try {
          const account = await this.accounts.getForUser(userId, platform);
          if (!account)
            return {
              platform,
              status: 'rejected' as const,
              message: `${platform} is not connected`,
            };
          if (platform === 'twitch') {
            return this.twitch.updateStream({
              accessToken: account.accessToken,
              clientId: process.env.TWITCH_CLIENT_ID ?? '',
              broadcasterId: account.externalId,
              title: input.title,
              gameId: input.categoryId,
            });
          }
          const categoryId = input.categoryId === undefined ? undefined : Number(input.categoryId);
          if (categoryId !== undefined && !Number.isSafeInteger(categoryId))
            return { platform, status: 'rejected' as const, message: 'Invalid Kick category id' };
          return this.kick.updateStream({
            accessToken: account.accessToken,
            title: input.title,
            categoryId,
          });
        } catch {
          return {
            platform,
            status: 'rejected' as const,
            message: `${platform} connection could not be used`,
          };
        }
      }),
    );
  }

  async sendForUser(
    userId: string,
    input: { message: string; destinations: Platform[] },
  ): Promise<OutboundMessageResult[]> {
    return Promise.all(
      input.destinations.map(async (platform) => {
        try {
          const account = await this.accounts.getForUser(userId, platform);
          if (!account)
            return {
              platform,
              status: 'rejected' as const,
              message: `${platform} is not connected`,
            };
          if (platform === 'twitch') {
            return this.twitch.sendMessage({
              accessToken: account.accessToken,
              clientId: process.env.TWITCH_CLIENT_ID ?? '',
              broadcasterId: account.externalId,
              senderId: account.externalId,
              message: input.message,
            });
          }
          const broadcasterUserId = Number(account.externalId);
          if (!Number.isSafeInteger(broadcasterUserId))
            return {
              platform,
              status: 'rejected' as const,
              message: 'Invalid Kick broadcaster id',
            };
          return this.kick.sendMessage({
            accessToken: account.accessToken,
            broadcasterUserId,
            content: input.message,
          });
        } catch {
          return {
            platform,
            status: 'rejected' as const,
            message: `${platform} connection could not be used`,
          };
        }
      }),
    );
  }
}
