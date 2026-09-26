import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { LiveSessionModule } from './live-session/live-session.module';
import { KickWebhookModule } from './platforms/kick/webhooks/kick-webhook.module';
import { TwitchEventSubModule } from './platforms/twitch/twitch-eventsub.module';
import { PlatformCommandService } from './platforms/platform-command.service';
import { KickPublicApiClient } from './platforms/kick/kick-public-api.client';
import { TwitchHelixClient } from './platforms/twitch/twitch-helix.client';
import { LiveGateway } from './realtime/live.gateway';
import { PlatformOAuthModule } from './platform-connections/platform-oauth.module';
import { PlatformTokenRefreshService } from './platform-connections/platform-token-refresh.service';
import { PlatformCommandController } from './platforms/platform-command.controller';
import { validateEnvironment } from './config/env';
import { auth } from './auth/auth';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    DatabaseModule,
    LiveSessionModule,
    KickWebhookModule,
    PlatformOAuthModule,
    TwitchEventSubModule,
    AuthModule.forRoot({
      auth,
      bodyParser: { rawBody: true },
    }),
  ],
  controllers: [AppController, PlatformCommandController],
  providers: [PlatformCommandService, KickPublicApiClient, TwitchHelixClient, LiveGateway, PlatformTokenRefreshService],
})
export class AppModule {}
