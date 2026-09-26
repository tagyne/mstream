import { createHash, randomBytes } from 'node:crypto';

export type OAuthStateRecord = {
  state: string;
  codeVerifier: string;
  platform: 'twitch' | 'kick';
  userId?: string;
  expiresAt: number;
};

export function createCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function createCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

export class OAuthStateStore {
  private readonly records = new Map<string, OAuthStateRecord>();

  issue(platform: OAuthStateRecord['platform'], userId?: string, now = Date.now()): OAuthStateRecord {
    const record: OAuthStateRecord = {
      state: randomBytes(32).toString('base64url'),
      codeVerifier: createCodeVerifier(),
      platform,
      userId,
      expiresAt: now + 10 * 60 * 1000,
    };
    this.records.set(record.state, record);
    return record;
  }

  consume(
    state: string,
    platform: OAuthStateRecord['platform'],
    now = Date.now(),
  ): OAuthStateRecord {
    const record = this.records.get(state);
    this.records.delete(state);
    if (!record || record.platform !== platform || record.expiresAt <= now) {
      throw new Error('Invalid or expired OAuth state');
    }
    return record;
  }
}
