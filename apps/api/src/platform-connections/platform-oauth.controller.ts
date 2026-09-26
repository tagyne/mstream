import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AllowAnonymous, Session, UserSession } from '@thallesp/nestjs-better-auth';
import type { Platform } from '@mstream/contracts';
import { PlatformOAuthService } from './platform-oauth.service';

@Controller('platform-connections')
export class PlatformOAuthController {
  constructor(private readonly oauth: PlatformOAuthService) {}

  @Get(':platform/start')
  start(@Param('platform') platform: Platform, @Session() session: UserSession): { url: string } {
    return { url: this.oauth.createAuthorizationUrl(platform, session.user.id) };
  }

  @Get(':platform/callback')
  @AllowAnonymous()
  async callback(@Param('platform') platform: Platform, @Query('state') state: string, @Query('code') code: string, @Res() response: Response): Promise<void> {
    if (!state || !code) throw new Error('OAuth callback requires state and code');
    const result = await this.oauth.complete(platform, state, code);
    const webUrl = process.env.WEB_URL ?? 'http://localhost:5173';
    response.redirect(`${webUrl}/dashboard?connected=` + result.platform);
  }
}
