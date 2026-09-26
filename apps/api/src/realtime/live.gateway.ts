import { Inject, Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { LiveSession } from '../live-session/live-session';

const socketOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? 'http://localhost:5173,http://localhost:8080')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

@Injectable()
@WebSocketGateway({ namespace: '/live', cors: { origin: socketOrigins, credentials: true } })
export class LiveGateway {
  @WebSocketServer()
  private server!: Server;

  constructor(@Inject(LiveSession) private readonly session: LiveSession) {
    this.session.subscribe((update) => {
      this.server?.emit('live.update', update);
    });
  }

  handleConnection(client: Socket): void {
    client.emit('live.snapshot', this.session.snapshot());
  }
}
