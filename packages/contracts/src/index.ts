export type Platform = 'twitch' | 'kick';

export type UnifiedMessage = {
  platform: Platform;
  externalId: string;
  author: {
    id?: string;
    name: string;
    badges: string[];
  };
  content: string;
  createdAt: string;
};

export type UnifiedEventType =
  'follow' | 'subscription' | 'gift' | 'cheer' | 'kick' | 'stream-update';

export type UnifiedEvent = {
  platform: Platform;
  type: UnifiedEventType;
  externalId: string;
  actor?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PlatformStatus =
  | { platform: Platform; state: 'connected'; updatedAt: string }
  | {
      platform: Platform;
      state: 'disconnected' | 'reconnecting' | 'error';
      updatedAt: string;
      message?: string;
    };

export type StreamMetadataResult = {
  platform: Platform;
  status: OutboundMessageResult['status'];
  title?: string;
  categoryId?: string;
  categoryName?: string;
  categoryImageUrl?: string;
  message?: string;
};

export type StreamCategory = { id: string; name: string; imageUrl: string };

export type StreamCategorySearchResult = {
  platform: Platform;
  categories: StreamCategory[];
  message?: string;
};

export type OutboundMessageResult = {
  platform: Platform;
  status: 'success' | 'rejected' | 'rate-limited' | 'token-expired' | 'network-error';
  externalId?: string;
  message?: string;
};

export type LiveSessionSnapshot = {
  messages: UnifiedMessage[];
  events: UnifiedEvent[];
  statuses: PlatformStatus[];
};

export type LiveSessionUpdate =
  | { kind: 'message'; value: UnifiedMessage }
  | { kind: 'event'; value: UnifiedEvent }
  | { kind: 'status'; value: PlatformStatus };

export * from './fixtures.js';
