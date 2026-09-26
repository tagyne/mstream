import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Platform } from '@mstream/contracts';
import { Repository } from 'typeorm';
import { PlatformConnection } from '../database/entities/platform-connection.entity';
import { configuredTokenVault, TokenVault } from './token-vault';
import { TwitchEventSubRuntime } from '../platforms/twitch/eventsub-runtime';
import { LiveSession } from '../live-session/live-session';

type RefreshResponse = { access_token: string; refresh_token?: string; expires_in?: number; scope?: string[] | string };

@Injectable()
export class PlatformTokenRefreshService {
  constructor(
    @InjectRepository(PlatformConnection) private readonly connections: Repository<PlatformConnection>,
    @Optional() private readonly vault: TokenVault = configuredTokenVault(),
    @Optional() private readonly fetchImpl: typeof fetch = fetch,
    @Optional() private readonly twitchRuntime?: TwitchEventSubRuntime,
    @Optional() @Inject(LiveSession) private readonly session?: LiveSession,
  ) {}

  async refreshIfNeeded(connection: PlatformConnection, now = Date.now()): Promise<PlatformConnection> {
    if (!connection.accessTokenExpiresAt || connection.accessTokenExpiresAt.getTime() - now > 60_000) return connection;
    return this.refresh(connection);
  }

  async refresh(connection: PlatformConnection): Promise<PlatformConnection> {
    try {
      const prefix = connection.platform === 'twitch' ? 'TWITCH' : 'KICK';
      const response = await this.fetchImpl(connection.platform === 'twitch' ? 'https://id.twitch.tv/oauth2/token' : 'https://id.kick.com/oauth/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.vault.decrypt(connection.refreshTokenEncrypted), client_id: process.env[`${prefix}_CLIENT_ID`] ?? '', client_secret: process.env[`${prefix}_CLIENT_SECRET`] ?? '' }),
      });
      if (!response.ok) throw new Error(`Token refresh failed with ${response.status}`);
      const tokens = await response.json() as RefreshResponse;
      Object.assign(connection, {
        accessTokenEncrypted: this.vault.encrypt(tokens.access_token),
        refreshTokenEncrypted: this.vault.encrypt(tokens.refresh_token ?? this.vault.decrypt(connection.refreshTokenEncrypted)),
        accessTokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        scopes: typeof tokens.scope === 'string' ? tokens.scope.split(' ').filter(Boolean) : tokens.scope ?? connection.scopes,
        status: 'connected', lastError: null,
      });
      const saved = await this.connections.save(connection);
      this.session?.setStatus({ platform: connection.platform, state: 'connected', updatedAt: new Date().toISOString() });
      if (connection.platform === 'twitch') this.twitchRuntime?.start(tokens.access_token, process.env.TWITCH_CLIENT_ID ?? '', connection.externalId, this.fetchImpl);
      return saved;
    } catch (error) {
      connection.status = 'error'; connection.lastError = error instanceof Error ? error.message : 'Token refresh failed';
      this.session?.setStatus({ platform: connection.platform, state: 'error', message: connection.lastError, updatedAt: new Date().toISOString() });
      return this.connections.save(connection);
    }
  }
}
