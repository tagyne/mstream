import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { LiveSessionModule } from './live-session/live-session.module';
import { KickWebhookModule } from './kick/kick-webhook.module';
import { TwitchEventSubModule } from './twitch/twitch-eventsub.module';
import { PlatformCommandService } from './platform-commands/platform-command.service';
import { KickPublicApiClient } from './kick/kick-public-api.client';
import { TwitchHelixClient } from './twitch/twitch-helix.client';
import { LiveGateway } from './realtime/live.gateway';
import { PlatformAccountSyncModule } from './platform-connections/platform-account-sync.module';
import { PlatformCommandController } from './platform-commands/platform-command.controller';
import { auth } from './auth';
import { BetterAuthModule } from './better-auth/better-auth.module';
import { StreamProfileModule } from './stream-profile/stream-profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    DatabaseModule,
    StreamProfileModule,
    BetterAuthModule,
    LiveSessionModule,
    KickWebhookModule,
    PlatformAccountSyncModule,
    TwitchEventSubModule,
    AuthModule.forRoot({
      auth,
      bodyParser: { rawBody: true },
    }),
  ],
  controllers: [AppController, PlatformCommandController],
  providers: [PlatformCommandService, KickPublicApiClient, TwitchHelixClient, LiveGateway],
})
export class AppModule {}
