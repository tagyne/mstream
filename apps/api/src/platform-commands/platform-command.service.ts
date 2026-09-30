import { Injectable } from '@nestjs/common';
import type { OutboundMessageResult, Platform, StreamMetadataResult } from '@mstream/contracts';
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
          return platform === 'twitch'
            ? this.twitch.getStream({
                accessToken: account.accessToken,
                clientId: process.env.TWITCH_CLIENT_ID ?? '',
                broadcasterId: account.externalId,
              })
            : this.kick.getStream(account.accessToken);
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
