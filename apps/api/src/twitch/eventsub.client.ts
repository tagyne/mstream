import { Injectable, Optional } from '@nestjs/common';
import WebSocket from 'ws';
import { LiveSession } from '../live-session/live-session';
import { TwitchEventSubMapper } from './eventsub.mapper';

export const TWITCH_EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws';
export type SocketLike = {
  on(event: string, handler: (...args: unknown[]) => void): SocketLike;
  close(): void;
};
export type SocketFactory = (url: string) => SocketLike;
type WelcomeHandler = (sessionId: string) => void | Promise<void>;

export type TwitchEventSubClientOptions = { reconnectDelayMs?: number };

@Injectable()
export class TwitchEventSubClient {
  private socket?: SocketLike;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectUrl?: string;
  private manuallyClosed = false;
  private readonly seenIds = new Set<string>();
  private readonly welcomeHandlers = new Set<WelcomeHandler>();

  constructor(
    private readonly session: LiveSession,
    @Optional() private readonly mapper = new TwitchEventSubMapper(),
    @Optional()
    private readonly socketFactory: SocketFactory = (url) =>
      new WebSocket(url) as unknown as SocketLike,
    @Optional() private readonly options: TwitchEventSubClientOptions = {},
  ) {}

  connect(url = this.reconnectUrl ?? TWITCH_EVENTSUB_URL): void {
    this.manuallyClosed = false;
    const socket = this.socketFactory(url);
    const previous = this.socket;
    this.socket = socket;
    socket.on('message', (raw) => this.handleMessage(String(raw)));
    socket.on('close', () => {
      if (this.socket !== socket || this.manuallyClosed) return;
      this.session.setStatus({
        platform: 'twitch',
        state: 'reconnecting',
        updatedAt: new Date().toISOString(),
      });
      this.scheduleReconnect();
    });
    socket.on('error', () => {
      if (this.socket !== socket) return;
      this.session.setStatus({
        platform: 'twitch',
        state: 'error',
        message: 'EventSub socket error',
        updatedAt: new Date().toISOString(),
      });
    });
    if (previous && previous !== socket) {
      // The old socket stays alive during a server-requested reconnect until the new one welcomes.
    }
  }

  onSessionWelcome(handler: WelcomeHandler): () => void {
    this.welcomeHandlers.add(handler);
    return () => this.welcomeHandlers.delete(handler);
  }

  close(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.socket?.close();
    this.socket = undefined;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.manuallyClosed) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, this.options.reconnectDelayMs ?? 1000);
  }

  private handleMessage(raw: string): void {
    let envelope: Parameters<TwitchEventSubMapper['map']>[0];
    try {
      envelope = JSON.parse(raw) as typeof envelope;
    } catch {
      return;
    }
    const metadata = envelope.metadata;
    if (!metadata?.message_id || this.seenIds.has(metadata.message_id)) return;
    this.seenIds.add(metadata.message_id);
    if (this.seenIds.size > 10_000) this.seenIds.delete(this.seenIds.values().next().value!);

    if (metadata.message_type === 'session_welcome') {
      const sessionId = envelope.payload?.session?.id;
      this.reconnectUrl = undefined;
      this.session.setStatus({
        platform: 'twitch',
        state: 'connected',
        updatedAt: metadata.message_timestamp ?? new Date().toISOString(),
      });
      if (sessionId) for (const handler of this.welcomeHandlers) void handler(sessionId);
      return;
    }
    if (metadata.message_type === 'session_reconnect') {
      const url = envelope.payload?.session?.reconnect_url;
      if (url) this.connect(url);
      return;
    }
    if (metadata.message_type === 'session_keepalive') return;
    const mapped = this.mapper.map(envelope);
    if (mapped?.message) this.session.addMessage(mapped.message);
    if (mapped?.event) this.session.addEvent(mapped.event);
  }
}
