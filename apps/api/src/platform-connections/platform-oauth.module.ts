import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformConnection } from '../database/entities/platform-connection.entity';
import { PlatformOAuthController } from './platform-oauth.controller';
import { PlatformOAuthService } from './platform-oauth.service';
import { TwitchEventSubModule } from '../platforms/twitch/twitch-eventsub.module';
import { LiveSessionModule } from '../live-session/live-session.module';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformConnection]), TwitchEventSubModule, LiveSessionModule],
  controllers: [PlatformOAuthController],
  providers: [PlatformOAuthService],
})
export class PlatformOAuthModule {}
