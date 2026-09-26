import type { UnifiedEvent, UnifiedMessage } from './index.js';

export const twitchMessageFixture: UnifiedMessage = {
  platform: 'twitch', externalId: 'fixture-twitch-message', author: { id: '1', name: 'twitch-viewer', badges: ['subscriber:1'] }, content: 'Hello Twitch', createdAt: '2026-01-01T00:00:00.000Z',
};

export const kickMessageFixture: UnifiedMessage = {
  platform: 'kick', externalId: 'fixture-kick-message', author: { id: '2', name: 'kick-viewer', badges: [] }, content: 'Hello Kick', createdAt: '2026-01-01T00:00:01.000Z',
};

export const followFixture: UnifiedEvent = {
  platform: 'twitch', type: 'follow', externalId: 'fixture-follow', actor: 'new-follower', metadata: {}, createdAt: '2026-01-01T00:00:02.000Z',
};
