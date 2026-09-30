import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageComposer } from './message-composer';

describe('MessageComposer', () => {
  it('selects connected platforms by default and keeps partial results visible', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          { platform: 'twitch', status: 'success' },
          { platform: 'kick', status: 'network-error', message: 'Kick indisponible' },
        ]),
        { status: 200 },
      ),
    );
    const user = userEvent.setup();
    render(
      <MessageComposer
        statuses={[
          { platform: 'twitch', state: 'connected', updatedAt: 'now' },
          { platform: 'kick', state: 'connected', updatedAt: 'now' },
        ]}
      />,
    );
    const twitch = screen.getByRole('checkbox', { name: /twitch/i });
    const kick = screen.getByRole('checkbox', { name: /kick/i });
    expect(twitch).toBeChecked();
    expect(kick).toBeChecked();
    expect(twitch.closest('label')?.querySelector('img')).toHaveClass('platform-icon-twitch');
    expect(kick.closest('label')?.querySelector('img')).toHaveClass('platform-icon-kick');
    await user.click(screen.getByRole('checkbox', { name: /kick/i }));
    expect(screen.getByRole('checkbox', { name: /kick/i })).not.toBeChecked();
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(fetchMock).toHaveBeenCalledWith(
      '/commands/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'Hello', destinations: ['twitch'] }),
      }),
    );
    const result = await screen.findByText('Kick indisponible');
    expect(result.closest('li')?.querySelector('img')).toHaveClass('platform-icon-kick');
    fetchMock.mockRestore();
  });

  it('rejects a whitespace-only message before sending', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    render(
      <MessageComposer statuses={[{ platform: 'twitch', state: 'connected', updatedAt: 'now' }]} />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Message' }), '   ');
    await user.tab();
    expect(await screen.findByRole('alert')).toHaveTextContent('Saisissez un message.');
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
