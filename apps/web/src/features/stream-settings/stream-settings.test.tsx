import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StreamSettings } from './stream-settings';

describe('StreamSettings', () => {
  it('shows platform choices before the full-row stream fields', () => {
    render(<StreamSettings statuses={[]} />);

    const twitch = screen.getByRole('checkbox', { name: /twitch/i });
    const kick = screen.getByRole('checkbox', { name: /kick/i });
    expect(
      screen.queryByRole('button', { name: /Afficher les paramètres/i }),
    ).not.toBeInTheDocument();
    const title = screen.getByRole('textbox', { name: 'Titre' });
    const category = screen.getByRole('textbox', { name: 'Catégorie / ID' });

    expect(twitch.closest('label')?.querySelector('img')).toHaveClass('platform-icon-twitch');
    expect(kick.closest('label')?.querySelector('img')).toHaveClass('platform-icon-kick');
    expect(twitch.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(kick.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.closest('.settings-fields')).toContainElement(category);
    expect(category.closest('label')?.parentElement).toBe(title.closest('.settings-fields'));
  });

  it('validates that a title or category is present and sends the selected destination', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async (_url, init) =>
          new Response(
            JSON.stringify(
              init?.method === 'PATCH' ? [{ platform: 'kick', status: 'success' }] : [],
            ),
            { status: 200 },
          ),
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

    await user.click(screen.getByRole('checkbox', { name: /twitch/i }));
    await user.type(screen.getByRole('textbox', { name: 'Catégorie / ID' }), ' 123 ');
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

describe('StreamSettings prefill', () => {
  it('loads each platform values and switches the displayed title and category', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            platform: 'twitch',
            status: 'success',
            title: 'Twitch live',
            categoryId: '11',
            categoryName: 'Games',
          },
          {
            platform: 'kick',
            status: 'success',
            title: 'Kick live',
            categoryId: '22',
            categoryName: 'Art',
          },
        ]),
      ),
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
    expect(await screen.findByDisplayValue('Twitch live')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Catégorie / ID' })).toHaveValue('11');
    await user.click(screen.getByRole('checkbox', { name: /kick/i }));
    expect(screen.getByRole('textbox', { name: 'Titre' })).toHaveValue('Kick live');
    expect(screen.getByRole('textbox', { name: 'Catégorie / ID' })).toHaveValue('22');
    expect(screen.getByText('Art')).toBeInTheDocument();
    fetchMock.mockRestore();
  });

  it('keeps an edit made before the metadata response arrives', async () => {
    let resolveResponse!: (response: Response) => void;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveResponse = resolve;
        }),
    );
    const user = userEvent.setup();
    render(
      <StreamSettings statuses={[{ platform: 'twitch', state: 'connected', updatedAt: 'now' }]} />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Titre' }), 'Mon titre');
    resolveResponse(
      new Response(
        JSON.stringify([
          {
            platform: 'twitch',
            status: 'success',
            title: 'Ancien',
            categoryId: '11',
            categoryName: 'Games',
          },
        ]),
      ),
    );
    expect(await screen.findByText('Games')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Titre' })).toHaveValue('Mon titre');
    fetchMock.mockRestore();
  });
});

describe('StreamSettings per-platform updates', () => {
  it('sends each platform its own category ID', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_url, init) =>
        new Response(
          JSON.stringify(
            init?.method === 'PATCH'
              ? [{ platform: JSON.parse(String(init.body)).destinations[0], status: 'success' }]
              : [
                  {
                    platform: 'twitch',
                    status: 'success',
                    title: 'Twitch',
                    categoryId: '11',
                    categoryName: 'Games',
                  },
                  {
                    platform: 'kick',
                    status: 'success',
                    title: 'Kick',
                    categoryId: '22',
                    categoryName: 'Art',
                  },
                ],
          ),
        ),
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
    await screen.findByDisplayValue('Twitch');
    await user.click(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(fetchMock).toHaveBeenCalledWith(
      '/commands/stream',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'Twitch', categoryId: '11', destinations: ['twitch'] }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/commands/stream',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'Kick', categoryId: '22', destinations: ['kick'] }),
      }),
    );
    fetchMock.mockRestore();
  });
});

describe('StreamSettings persisted account recovery', () => {
  it('loads linked platform fields when realtime status is initially empty', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            platform: 'twitch',
            status: 'success',
            title: 'Stored live',
            categoryId: '44',
            categoryName: 'Games',
          },
          { platform: 'kick', status: 'rejected', message: 'kick is not connected' },
        ]),
      ),
    );
    render(<StreamSettings statuses={[]} />);
    expect(await screen.findByDisplayValue('Stored live')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /twitch/i })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: /kick/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    fetchMock.mockRestore();
  });
});
