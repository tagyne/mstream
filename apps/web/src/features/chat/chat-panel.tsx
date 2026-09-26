import { useEffect, useRef, useState } from 'react';
import type { UnifiedMessage } from '@mstream/contracts';

export function ChatPanel({ messages }: { messages: UnifiedMessage[] }) {
  const listRef = useRef<HTMLOListElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  useEffect(() => { if (atBottom) setNewCount(0); else setNewCount((count) => count + 1); }, [messages.length]);
  const jumpToLatest = () => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); setAtBottom(true); setNewCount(0); };
  return <section className="panel chat-panel" aria-labelledby="chat-title">
    <div className="panel-heading"><h2 id="chat-title">Chat</h2><span>{messages.length} messages</span></div>
    {messages.length === 0 ? <p className="empty-state">Les messages des plateformes apparaîtront ici.</p> : <ol ref={listRef} className="message-list" aria-live="polite" onScroll={(event) => { const element = event.currentTarget; setAtBottom(element.scrollHeight - element.scrollTop - element.clientHeight < 8); }}>{messages.map((message) => <li key={`${message.platform}-${message.externalId}`}><span className={`platform-badge platform-${message.platform}`}>{message.platform}</span><strong>{message.author.name}</strong><span>{message.content}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString()}</time></li>)}</ol>}
  </section>;
}
