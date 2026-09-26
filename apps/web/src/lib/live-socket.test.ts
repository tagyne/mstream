import { describe, expect, it } from 'vitest';
import { createLiveSocket, LIVE_NAMESPACE } from './live-socket';

describe('live socket client', () => {
  it('targets the API live namespace without embedding platform credentials', () => {
    const socket = createLiveSocket('http://api.test');
    expect(LIVE_NAMESPACE).toBe('/live');
    expect(socket).toBeDefined();
    expect(socket.io.opts.withCredentials).toBe(true);
    socket.close();
  });
});
