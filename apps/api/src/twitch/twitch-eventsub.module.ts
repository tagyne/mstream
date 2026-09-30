import { Module } from '@nestjs/common';
import { LiveSessionModule } from '../live-session/live-session.module';
import { TwitchEventSubClient } from './eventsub.client';
import { TwitchEventSubRuntime } from './eventsub-runtime';

@Module({
  imports: [LiveSessionModule],
  providers: [TwitchEventSubClient, TwitchEventSubRuntime],
  exports: [TwitchEventSubClient, TwitchEventSubRuntime],
})
export class TwitchEventSubModule {}
