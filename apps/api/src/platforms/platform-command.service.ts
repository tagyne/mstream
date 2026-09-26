import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { OutboundMessageResult, Platform } from '@mstream/contracts';
import { Repository } from 'typeorm';
import { PlatformConnection } from '../database/entities/platform-connection.entity';
import { configuredTokenVault, TokenVault } from '../platform-connections/token-vault';
import { KickPublicApiClient } from './kick/kick-public-api.client';
import { TwitchHelixClient } from './twitch/twitch-helix.client';
import { PlatformTokenRefreshService } from '../platform-connections/platform-token-refresh.service';

type TwitchMessageInput = { accessToken: string; clientId: string; broadcasterId: string; senderId: string };
type KickMessageInput = { accessToken: string; broadcasterUserId: number };
type SendMessageInput = { message: string; destinations: Platform[]; twitch?: TwitchMessageInput; kick?: KickMessageInput };

@Injectable()
export class PlatformCommandService {
  constructor(
    private readonly twitch: TwitchHelixClient,
    private readonly kick: KickPublicApiClient,
    @Optional() @InjectRepository(PlatformConnection) private readonly connections?: Repository<PlatformConnection>,
    @Optional() private readonly vault = configuredTokenVault(),
    @Optional() private readonly refresh?: PlatformTokenRefreshService,
  ) {}

  async sendMessage(input: SendMessageInput): Promise<OutboundMessageResult[]> {
    return Promise.all(input.destinations.map(async (platform) => {
      try {
        if (platform === 'twitch' && input.twitch) return this.twitch.sendMessage({ ...input.twitch, message: input.message });
        if (platform === 'kick' && input.kick) return this.kick.sendMessage({ ...input.kick, content: input.message });
        return { platform, status: 'rejected' as const, message: 'Platform credentials are unavailable' };
      } catch {
        return { platform, status: 'network-error' as const, message: `${platform} command failed` };
      }
    }));
  }

  async updateStreamForUser(userId: string, input: { title?: string; categoryId?: string; destinations: Platform[] }): Promise<OutboundMessageResult[]> {
    if (!this.connections) return input.destinations.map((platform) => ({ platform, status: 'rejected' as const, message: 'Platform connections are unavailable' }));
    const connections = await this.connections.find({ where: { userId } });
    return Promise.all(input.destinations.map(async (platform) => {
      const connection = connections.find((candidate) => candidate.platform === platform);
      if (!connection) return { platform, status: 'rejected' as const, message: `${platform} is not connected` };
      try {
        const usable = this.refresh ? await this.refresh.refreshIfNeeded(connection) : connection;
        if (usable.status !== 'connected') return { platform, status: 'rejected' as const, message: `${platform} is not connected` };
        const token = this.vault.decrypt(usable.accessTokenEncrypted);
        if (platform === 'twitch') return this.twitch.updateStream({ accessToken: token, clientId: process.env.TWITCH_CLIENT_ID ?? '', broadcasterId: usable.externalId, title: input.title, gameId: input.categoryId });
        const categoryId = input.categoryId === undefined ? undefined : Number(input.categoryId);
        if (categoryId !== undefined && !Number.isSafeInteger(categoryId)) return { platform, status: 'rejected' as const, message: 'Invalid Kick category id' };
        return this.kick.updateStream({ accessToken: token, title: input.title, categoryId });
      } catch {
        return { platform, status: 'rejected' as const, message: `${platform} connection could not be used` };
      }
    }));
  }

  async sendForUser(userId: string, input: { message: string; destinations: Platform[] }): Promise<OutboundMessageResult[]> {
    if (!this.connections) return input.destinations.map((platform) => ({ platform, status: 'rejected' as const, message: 'Platform connections are unavailable' }));
    const connections = await this.connections.find({ where: { userId } });
    return Promise.all(input.destinations.map(async (platform) => {
      const connection = connections.find((candidate) => candidate.platform === platform);
      if (!connection) return { platform, status: 'rejected' as const, message: `${platform} is not connected` };
      try {
        const usable = this.refresh ? await this.refresh.refreshIfNeeded(connection) : connection;
        if (usable.status !== 'connected') return { platform, status: 'rejected' as const, message: `${platform} is not connected` };
        const token = this.vault.decrypt(usable.accessTokenEncrypted);
        if (platform === 'twitch') return this.twitch.sendMessage({ accessToken: token, clientId: process.env.TWITCH_CLIENT_ID ?? '', broadcasterId: usable.externalId, senderId: usable.externalId, message: input.message });
        const broadcasterUserId = Number(usable.externalId);
        if (!Number.isSafeInteger(broadcasterUserId)) return { platform, status: 'rejected' as const, message: 'Invalid Kick broadcaster id' };
        return this.kick.sendMessage({ accessToken: token, broadcasterUserId, content: input.message });
      } catch {
        return { platform, status: 'rejected' as const, message: `${platform} connection could not be used` };
      }
    }));
  }
}
