import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { UnifiedMessage } from '@mstream/contracts';
import { Button } from '../../components/ui/button';

export function ChatPanel({
  messages,
  footer,
}: {
  messages: UnifiedMessage[];
  footer?: ReactNode;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  useEffect(() => {
    if (atBottom) setNewCount(0);
    else setNewCount((count) => count + 1);
  }, [messages.length]);
  const jumpToLatest = () => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    setAtBottom(true);
    setNewCount(0);
  };
  return (
    <section className="panel chat-panel" aria-labelledby="chat-title">
      <div className="chat-message-area">
        <div className="panel-heading">
          <h2 id="chat-title">Chat</h2>
          <span>{messages.length} messages</span>
        </div>
        {newCount > 0 && (
          <Button variant="secondary" onClick={jumpToLatest} type="button">
            {newCount} nouveau{newCount > 1 ? 'x' : ''} message{newCount > 1 ? 's' : ''}
          </Button>
        )}
        {messages.length === 0 ? (
          <p className="empty-state">Les messages des plateformes apparaîtront ici.</p>
        ) : (
          <ol
            ref={listRef}
            className="message-list"
            aria-live="polite"
            onScroll={(event) => {
              const element = event.currentTarget;
              setAtBottom(element.scrollHeight - element.scrollTop - element.clientHeight < 8);
            }}
          >
            {messages.map((message) => (
              <li key={`${message.platform}-${message.externalId}`}>
                <span className={`platform-badge platform-${message.platform}`}>
                  {message.platform}
                </span>
                <strong>{message.author.name}</strong>
                <span>{message.content}</span>
                <time dateTime={message.createdAt}>
                  {new Date(message.createdAt).toLocaleTimeString()}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
      {footer && <div className="chat-footer">{footer}</div>}
    </section>
  );
}
