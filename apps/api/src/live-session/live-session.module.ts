import { Module } from '@nestjs/common';
import { LiveSession } from './live-session';

@Module({ providers: [LiveSession], exports: [LiveSession] })
export class LiveSessionModule {}
