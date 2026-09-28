import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetterAuthAccount } from './entities/account.entity';
import { BetterAuthRateLimit } from './entities/rate-limit.entity';
import { BetterAuthSession } from './entities/session.entity';
import { BetterAuthUser } from './entities/user.entity';
import { BetterAuthVerification } from './entities/verification.entity';
import { PlatformAccountTokenService } from './platform-account-token.service';

export const betterAuthEntities = [
  BetterAuthUser,
  BetterAuthSession,
  BetterAuthAccount,
  BetterAuthVerification,
  BetterAuthRateLimit,
];

@Module({
  imports: [TypeOrmModule.forFeature(betterAuthEntities)],
  providers: [PlatformAccountTokenService],
  exports: [TypeOrmModule, PlatformAccountTokenService],
})
export class BetterAuthModule {}
