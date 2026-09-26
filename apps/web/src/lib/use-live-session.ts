import { useEffect, useMemo, useState } from 'react';
import type { LiveSessionSnapshot, LiveSessionUpdate, PlatformStatus, UnifiedEvent, UnifiedMessage } from '@mstream/contracts';
import { createLiveSocket } from './live-socket';

const EMPTY: LiveSessionSnapshot = { messages: [], events: [], statuses: [] };

export function useLiveSession(): LiveSessionSnapshot {
  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot>(EMPTY);
  const socket = useMemo(() => createLiveSocket(), []);

  useEffect(() => {
    const update = (value: LiveSessionUpdate) => setSnapshot((current) => ({
      ...current,
      ...(value.kind === 'message' ? { messages: [...current.messages, value.value as UnifiedMessage] } : {}),
      ...(value.kind === 'event' ? { events: [value.value as UnifiedEvent, ...current.events] } : {}),
      ...(value.kind === 'status' ? { statuses: [...current.statuses.filter((status) => status.platform !== (value.value as PlatformStatus).platform), value.value as PlatformStatus] } : {}),
    }));
    socket.on('live.snapshot', setSnapshot);
    socket.on('live.update', update);
    socket.connect();
    return () => { socket.off('live.snapshot', setSnapshot); socket.off('live.update', update); socket.close(); };
  }, [socket]);

  return snapshot;
}
