import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatPanel } from './chat-panel';

describe('ChatPanel', () => {
  it('shows platform badge and author for normalized messages', () => {
    render(
      <ChatPanel
        messages={[
          {
            platform: 'kick',
            externalId: '1',
            author: { name: 'viewer', badges: [] },
            content: 'Bonjour',
            createdAt: '2026-09-26T10:00:00Z',
          },
        ]}
      />,
    );
    const platform = screen.getByLabelText('kick');
    expect(platform).toBeInTheDocument();
    expect(platform.querySelector('img')).toHaveClass('platform-icon-kick');
    expect(screen.getByText('viewer')).toBeInTheDocument();
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
  });

  it('shows a new-message count while scrolled up and jumps to the latest messages', () => {
    const firstMessage = {
      platform: 'kick' as const,
      externalId: '1',
      author: { name: 'viewer', badges: [] },
      content: 'Bonjour',
      createdAt: '2026-09-26T10:00:00Z',
    };
    const { container, rerender } = render(<ChatPanel messages={[firstMessage]} />);
    const list = container.querySelector('ol')!;
    const scrollTo = vi.fn();
    Object.defineProperties(list, {
      scrollHeight: { configurable: true, value: 300 },
      scrollTop: { configurable: true, value: 0 },
      clientHeight: { configurable: true, value: 100 },
      scrollTo: { configurable: true, value: scrollTo },
    });

    fireEvent.scroll(list);
    rerender(
      <ChatPanel
        messages={[
          firstMessage,
          { ...firstMessage, externalId: '2', content: 'Encore un message' },
        ]}
      />,
    );

    const newMessagesButton = container.querySelector('button')!;
    fireEvent.click(newMessagesButton);

    expect(scrollTo).toHaveBeenCalledWith({ top: 300, behavior: 'smooth' });
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });
});
