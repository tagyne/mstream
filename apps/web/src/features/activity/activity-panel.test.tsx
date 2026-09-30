import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityPanel } from './activity-panel';

describe('ActivityPanel', () => {
  it('shows the platform icon without a visible name for each event', () => {
    render(
      <ActivityPanel
        events={[
          {
            platform: 'twitch',
            type: 'follow',
            externalId: 'event-1',
            actor: 'viewer',
            metadata: {},
            createdAt: '2026-09-30T10:00:00Z',
          },
        ]}
      />,
    );

    const platform = screen.getByLabelText('twitch');
    expect(platform.querySelector('img')).toHaveClass('platform-icon-twitch');
    expect(platform).toHaveTextContent('');
  });
});
