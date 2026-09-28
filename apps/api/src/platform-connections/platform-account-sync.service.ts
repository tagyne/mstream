import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PlatformAccountTokenService } from '../better-auth/platform-account-token.service';
import {
  registerPlatformAccountChangeHandler,
  type LinkedPlatformAccount,
} from '../better-auth/platform-account-hooks';
import { LiveSession } from '../live-session/live-session';
import { TwitchEventSubRuntime } from '../twitch/eventsub-runtime';

@Injectable()
export class PlatformAccountSyncService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly session: LiveSession,
    private readonly twitchRuntime: TwitchEventSubRuntime,
    private readonly accountTokens: PlatformAccountTokenService,
  ) {}

  onModuleInit(): void {
    registerPlatformAccountChangeHandler((account, deleted) => this.sync(account, deleted));
  }

  onModuleDestroy(): void {
    registerPlatformAccountChangeHandler(undefined);
  }

  async sync(account: LinkedPlatformAccount, deleted = false): Promise<void> {
    const platform = account.providerId === 'twitch' ? 'twitch' : 'kick';
    if (deleted) {
      if (platform === 'twitch') this.twitchRuntime.stop();
      this.session.setStatus({
        platform,
        state: 'disconnected',
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const token = await this.accountTokens.getForUser(account.userId, platform);
    if (!token) throw new Error(`${platform} account is unavailable after linking`);
    this.session.setStatus({ platform, state: 'connected', updatedAt: new Date().toISOString() });
    if (platform === 'twitch') {
      this.twitchRuntime.start(
        token.accessToken,
        process.env.TWITCH_CLIENT_ID ?? '',
        account.accountId,
      );
    }
  }
}
