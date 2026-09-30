import { Controller, Post, Req } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { KickWebhookService } from './kick-webhook.service';

@Controller('webhooks/kick')
@AllowAnonymous()
export class KickWebhookController {
  constructor(private readonly service: KickWebhookService) {}

  @Post()
  receive(@Req() request: Request & { rawBody?: Buffer }) {
    const headers = request.headers;
    return this.service.process(
      request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {})),
      {
        messageId: this.header(headers['kick-event-message-id']),
        messageTimestamp: this.header(headers['kick-event-message-timestamp']),
        signature: this.header(headers['kick-event-signature']),
        eventType: this.header(headers['kick-event-type']),
        eventVersion: this.header(headers['kick-event-version']),
      },
    );
  }

  private header(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }
}
