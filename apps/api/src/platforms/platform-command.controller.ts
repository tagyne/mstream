import { BadRequestException, Body, Controller, Patch, Post } from '@nestjs/common';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';
import type { Platform } from '@mstream/contracts';
import { PlatformCommandService } from './platform-command.service';

@Controller('commands')
export class PlatformCommandController {
  constructor(private readonly commands: PlatformCommandService) {}

  @Patch('stream')
  updateStream(@Body() body: unknown, @Session() session: UserSession) {
    const input = this.parseStreamBody(body);
    return this.commands.updateStreamForUser(session.user.id, input);
  }

  @Post('messages')
  sendMessage(@Body() body: unknown, @Session() session: UserSession) {
    const input = this.parseBody(body);
    return this.commands.sendForUser(session.user.id, input);
  }

  private parseStreamBody(body: unknown): { title?: string; categoryId?: string; destinations: Platform[] } {
    if (!body || typeof body !== 'object') throw new BadRequestException('Request body must be an object');
    const value = body as Record<string, unknown>;
    const title = typeof value.title === 'string' ? value.title.trim() : undefined;
    const categoryId = typeof value.categoryId === 'string' ? value.categoryId.trim() : undefined;
    const destinations = Array.isArray(value.destinations) ? value.destinations : [];
    if ((!title && !categoryId) || (title && title.length > 140) || destinations.length === 0 || destinations.some((platform) => platform !== 'twitch' && platform !== 'kick')) throw new BadRequestException('A valid title/category and destinations are required');
    return { title, categoryId, destinations: [...new Set(destinations)] as Platform[] };
  }

  private parseBody(body: unknown): { message: string; destinations: Platform[] } {
    if (!body || typeof body !== 'object') throw new BadRequestException('Request body must be an object');
    const value = body as Record<string, unknown>;
    const message = typeof value.message === 'string' ? value.message.trim() : '';
    const destinations = Array.isArray(value.destinations) ? value.destinations : [];
    if (!message || message.length > 500) throw new BadRequestException('Message must contain 1 to 500 characters');
    if (destinations.length === 0 || destinations.some((platform) => platform !== 'twitch' && platform !== 'kick')) {
      throw new BadRequestException('Destinations must contain twitch and/or kick');
    }
    return { message, destinations: [...new Set(destinations)] as Platform[] };
  }
}
