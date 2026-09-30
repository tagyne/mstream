import { Module } from '@nestjs/common';
import { BetterAuthModule } from '../better-auth/better-auth.module';
import { LiveSessionModule } from '../live-session/live-session.module';
import { TwitchEventSubModule } from '../twitch/twitch-eventsub.module';
import { PlatformAccountSyncService } from './platform-account-sync.service';

@Module({
  imports: [BetterAuthModule, LiveSessionModule, TwitchEventSubModule],
  providers: [PlatformAccountSyncService],
})
export class PlatformAccountSyncModule {}
