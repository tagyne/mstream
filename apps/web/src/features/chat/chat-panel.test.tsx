import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatPanel } from './chat-panel';

describe('ChatPanel', () => {
  it('shows platform badge and author for normalized messages', () => {
    render(<ChatPanel messages={[{ platform: 'kick', externalId: '1', author: { name: 'viewer', badges: [] }, content: 'Bonjour', createdAt: '2026-09-26T10:00:00Z' }]} />);
    expect(screen.getByText('kick')).toBeInTheDocument();
    expect(screen.getByText('viewer')).toBeInTheDocument();
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
  });
});
