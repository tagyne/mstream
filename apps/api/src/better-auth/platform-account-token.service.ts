import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Platform } from '@mstream/contracts';
import { Repository } from 'typeorm';
import { BetterAuthAccount } from './entities/account.entity';

export type PlatformAccountToken = {
  externalId: string;
  accessToken: string;
  accessTokenExpiresAt?: Date;
  scopes: string[];
};

@Injectable()
export class PlatformAccountTokenService {
  constructor(
    @InjectRepository(BetterAuthAccount) private readonly accounts: Repository<BetterAuthAccount>,
  ) {}

  async getForUser(userId: string, platform: Platform): Promise<PlatformAccountToken | null> {
    const account = await this.accounts.findOne({ where: { userId, providerId: platform } });
    if (!account) return null;
    const { auth } = await import('../auth.js');
    const token = await auth.api.getAccessToken({ body: { accountId: account.id, userId } });
    return {
      externalId: account.accountId,
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      scopes: token.scopes,
    };
  }
}
