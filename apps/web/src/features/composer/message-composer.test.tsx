import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageComposer } from './message-composer';

describe('MessageComposer', () => {
  it('selects connected platforms by default and keeps partial results visible', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([
      { platform: 'twitch', status: 'success' },
      { platform: 'kick', status: 'network-error', message: 'Kick indisponible' },
    ]), { status: 200 }));
    const user = userEvent.setup();
    render(<MessageComposer statuses={[{ platform: 'twitch', state: 'connected', updatedAt: 'now' }, { platform: 'kick', state: 'connected', updatedAt: 'now' }]} />);
    expect(screen.getByRole('checkbox', { name: /twitch/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /kick/i })).toBeChecked();
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(fetchMock).toHaveBeenCalledWith('/commands/messages', expect.objectContaining({ method: 'POST' }));
    expect(await screen.findByText('Kick indisponible')).toBeInTheDocument();
    fetchMock.mockRestore();
  });
});
