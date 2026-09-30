import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StreamSettings } from './stream-settings';

describe('StreamSettings', () => {
  it('shows platform choices before the full-row stream fields', () => {
    render(<StreamSettings statuses={[]} />);

    const twitch = screen.getByRole('checkbox', { name: /twitch/i });
    const kick = screen.getByRole('checkbox', { name: /kick/i });
    const title = screen.getByRole('textbox', { name: 'Titre' });
    const category = screen.getByRole('textbox', { name: 'Catégorie / ID' });

    expect(twitch.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(kick.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.closest('.settings-fields')).toContainElement(category);
    expect(category.closest('label')?.parentElement).toBe(title.closest('.settings-fields'));
  });

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
    const result = await screen.findByText('success');
    expect(result.closest('li')?.querySelector('img')).toHaveClass('platform-icon-kick');
    fetchMock.mockRestore();
  });
});
