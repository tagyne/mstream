import { io, type Socket } from 'socket.io-client';
import type { LiveSessionSnapshot, LiveSessionUpdate } from '@mstream/contracts';

export const LIVE_NAMESPACE = '/live';

export type LiveSocket = Socket<
  {
    'live.snapshot': (snapshot: LiveSessionSnapshot) => void;
    'live.update': (update: LiveSessionUpdate) => void;
  },
  Record<string, never>
>;

export function createLiveSocket(
  apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
): LiveSocket {
  return io(`${apiUrl}${LIVE_NAMESPACE}`, { autoConnect: false, withCredentials: true });
}
