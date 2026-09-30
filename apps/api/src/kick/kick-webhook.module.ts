import { Module } from '@nestjs/common';
import { LiveSessionModule } from '../live-session/live-session.module';
import { KickWebhookController } from './kick-webhook.controller';
import { KickWebhookService } from './kick-webhook.service';

@Module({
  imports: [LiveSessionModule],
  controllers: [KickWebhookController],
  providers: [KickWebhookService],
})
export class KickWebhookModule {}
