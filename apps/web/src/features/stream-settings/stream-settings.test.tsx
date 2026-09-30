import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StreamSettings } from './stream-settings';

describe('StreamSettings', () => {
  it('validates that a title or category is present and sends the selected destination', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify([{ platform: 'kick', status: 'success' }]), { status: 200 }),
      );
    const user = userEvent.setup();
    render(
      <StreamSettings
        statuses={[
          { platform: 'twitch', state: 'connected', updatedAt: 'now' },
          { platform: 'kick', state: 'connected', updatedAt: 'now' },
        ]}
      />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Titre' }), '   ');
    await user.tab();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Renseignez un titre ou une catégorie.',
    );
    expect(screen.getByRole('button', { name: 'Mettre à jour' })).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: 'Catégorie / ID' }), ' 123 ');
    await user.click(screen.getByRole('checkbox', { name: /twitch/i }));
    await user.click(screen.getByRole('button', { name: 'Mettre à jour' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/commands/stream',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ categoryId: '123', destinations: ['kick'] }),
      }),
    );
    fetchMock.mockRestore();
  });
});
