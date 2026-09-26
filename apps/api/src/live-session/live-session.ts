import type {
  PlatformStatus,
  UnifiedEvent,
  UnifiedMessage,
} from '@mstream/contracts';

export type LiveSessionUpdate =
  | { kind: 'message'; value: UnifiedMessage }
  | { kind: 'event'; value: UnifiedEvent }
  | { kind: 'status'; value: PlatformStatus };

export type LiveSessionSnapshot = {
  messages: UnifiedMessage[];
  events: UnifiedEvent[];
  statuses: PlatformStatus[];
};

export class LiveSession {
  private readonly messages: UnifiedMessage[] = [];
  private readonly events: UnifiedEvent[] = [];
  private readonly statuses = new Map<PlatformStatus['platform'], PlatformStatus>();
  private readonly messageIds = new Set<string>();
  private readonly eventIds = new Set<string>();
  private readonly listeners = new Set<(update: LiveSessionUpdate) => void>();

  addMessage(message: UnifiedMessage): boolean {
    const key = `${message.platform}:${message.externalId}`;
    if (this.messageIds.has(key)) return false;
    this.messageIds.add(key);
    this.messages.push(message);
    this.publish({ kind: 'message', value: message });
    return true;
  }

  addEvent(event: UnifiedEvent): boolean {
    const key = `${event.platform}:${event.externalId}`;
    if (this.eventIds.has(key)) return false;
    this.eventIds.add(key);
    this.events.push(event);
    this.publish({ kind: 'event', value: event });
    return true;
  }

  setStatus(status: PlatformStatus): void {
    this.statuses.set(status.platform, status);
    this.publish({ kind: 'status', value: status });
  }

  subscribe(listener: (update: LiveSessionUpdate) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): LiveSessionSnapshot {
    return {
      messages: [...this.messages],
      events: [...this.events],
      statuses: [...this.statuses.values()],
    };
  }

  private publish(update: LiveSessionUpdate): void {
    for (const listener of this.listeners) listener(update);
  }

  clear(): void {
    this.messages.length = 0;
    this.events.length = 0;
    this.statuses.clear();
    this.messageIds.clear();
    this.eventIds.clear();
  }
}
