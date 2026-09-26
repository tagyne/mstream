import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Platform } from '@mstream/contracts';
import { Repository } from 'typeorm';
import { PlatformConnection } from '../database/entities/platform-connection.entity';
import { createCodeChallenge, OAuthStateStore } from './oauth-security';
import { configuredTokenVault, TokenVault } from './token-vault';
import { TwitchEventSubRuntime } from '../platforms/twitch/eventsub-runtime';
import { LiveSession } from '../live-session/live-session';

type OAuthConfig = {
  authorizationUrl: string;
  tokenUrl: string;
  userUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  usePkce: boolean;
};

type TokenResponse = { access_token: string; refresh_token?: string; expires_in?: number; scope?: string[] | string };

@Injectable()
export class PlatformOAuthService {
  constructor(
    @InjectRepository(PlatformConnection) private readonly connections: Repository<PlatformConnection>,
    @Optional() private readonly stateStore = new OAuthStateStore(),
    @Optional() private readonly vault = configuredTokenVault(),
    @Optional() private readonly fetchImpl: typeof fetch = fetch,
    @Optional() private readonly twitchRuntime?: TwitchEventSubRuntime,
    @Optional() private readonly session?: LiveSession,
  ) {}

  createAuthorizationUrl(platform: Platform, userId: string): string {
    const config = this.config(platform);
    const state = this.stateStore.issue(platform, userId);
    const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: config.scopes.join(' '), state: state.state });
    if (config.usePkce) {
      params.set('code_challenge', createCodeChallenge(state.codeVerifier));
      params.set('code_challenge_method', 'S256');
    }
    return `${config.authorizationUrl}?${params}`;
  }

  async complete(platform: Platform, state: string, code: string): Promise<{ platform: Platform; externalId: string }> {
    const record = this.stateStore.consume(state, platform);
    if (!record.userId) throw new Error('OAuth state is not associated with a user');
    const config = this.config(platform);
    const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, code });
    if (config.usePkce) body.set('code_verifier', record.codeVerifier);
    const tokenResponse = await this.fetchImpl(config.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }).then(this.readOk<TokenResponse>);
    const identity = await this.fetchImpl(config.userUrl, { headers: { Authorization: `Bearer ${tokenResponse.access_token}`, ...(platform === 'twitch' ? { 'Client-Id': config.clientId } : {}) } }).then(this.readOk<unknown>);
    const externalId = this.extractExternalId(platform, identity);
    const existing = await this.connections.findOne({ where: { userId: record.userId, platform } });
    const data = {
      userId: record.userId, platform, externalId, scopes: typeof tokenResponse.scope === 'string' ? tokenResponse.scope.split(' ').filter(Boolean) : tokenResponse.scope ?? config.scopes,
      accessTokenEncrypted: this.vault.encrypt(tokenResponse.access_token), refreshTokenEncrypted: this.vault.encrypt(tokenResponse.refresh_token ?? ''),
      accessTokenExpiresAt: tokenResponse.expires_in ? new Date(Date.now() + tokenResponse.expires_in * 1000) : null,
      status: 'connected' as const, lastError: null,
    };
    await this.connections.save(existing ? Object.assign(existing, data) : this.connections.create(data));
    this.session?.setStatus({ platform, state: 'connected', updatedAt: new Date().toISOString() });
    if (platform === 'twitch') this.twitchRuntime?.start(tokenResponse.access_token, config.clientId, externalId, this.fetchImpl);
    return { platform, externalId };
  }

  private config(platform: Platform): OAuthConfig {
    if (platform !== 'twitch' && platform !== 'kick') throw new Error('Unsupported platform');
    const prefix = platform === 'twitch' ? 'TWITCH' : 'KICK';
    const required = (name: string): string => {
      const value = process.env[name];
      if (!value) throw new Error(`${name} is not configured`);
      return value;
    };
    return platform === 'twitch'
      ? { authorizationUrl: 'https://id.twitch.tv/oauth2/authorize', tokenUrl: 'https://id.twitch.tv/oauth2/token', userUrl: 'https://api.twitch.tv/helix/users', clientId: required(`${prefix}_CLIENT_ID`), clientSecret: required(`${prefix}_CLIENT_SECRET`), redirectUri: required(`${prefix}_REDIRECT_URI`), scopes: ['user:read:chat', 'user:write:chat', 'channel:manage:broadcast'], usePkce: false }
      : { authorizationUrl: 'https://id.kick.com/oauth/authorize', tokenUrl: 'https://id.kick.com/oauth/token', userUrl: 'https://api.kick.com/public/v1/users', clientId: required(`${prefix}_CLIENT_ID`), clientSecret: required(`${prefix}_CLIENT_SECRET`), redirectUri: required(`${prefix}_REDIRECT_URI`), scopes: ['user:read', 'channel:read', 'channel:write', 'chat:write', 'events:subscribe'], usePkce: true };
  }

  private extractExternalId(platform: Platform, value: unknown): string {
    const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const data = Array.isArray(record.data) ? record.data[0] as Record<string, unknown> | undefined : record;
    const id = data?.user_id ?? data?.id;
    if (typeof id !== 'string' && typeof id !== 'number') throw new Error(`${platform} identity response has no user id`);
    return String(id);
  }

  private readOk<T>(response: Response): Promise<T> {
    if (!response.ok) throw new Error(`OAuth request failed with ${response.status}`);
    return response.json() as Promise<T>;
  }
}
