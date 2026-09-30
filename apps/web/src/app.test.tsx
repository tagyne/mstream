import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('public application shell', () => {
  it('renders the local multistreaming landing page', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /multistreaming/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Connexion' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
  });
});

describe('login page', () => {
  it('renders Twitch and Kick sign-in actions', () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    const twitchButton = screen.getByRole('button', { name: 'Continuer avec Twitch' });
    const kickButton = screen.getByRole('button', { name: 'Continuer avec Kick' });
    expect(twitchButton.querySelector('img')).toHaveClass('platform-icon-twitch');
    expect(kickButton.querySelector('img')).toHaveClass('platform-icon-kick');
    expect(screen.queryByRole('textbox', { name: /email/i })).not.toBeInTheDocument();
  });
});

describe('dashboard session guard', () => {
  it('opens the dashboard without a session in development', async () => {
    vi.stubEnv('DEV', true);
    const fetchMock = vi.fn(async () => new Response('[]'));
    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/get-session', {
      credentials: 'include',
    });
    expect(
      screen.getByLabelText('État des plateformes').querySelectorAll('.platform-icon'),
    ).toHaveLength(2);

    const settingsTitle = screen.getByRole('heading', { name: 'Paramètres du stream' });
    const activityTitle = screen.getByRole('heading', { name: 'Fil d’actualité' });
    const chatTitle = screen.getByRole('heading', { name: 'Chat' });
    const replyTitle = screen.getByRole('heading', { name: 'Répondre' });
    const sidebar = settingsTitle.closest('.dashboard-sidebar');

    expect(sidebar).toContainElement(activityTitle);
    expect(sidebar).not.toContainElement(chatTitle);
    expect(
      settingsTitle.compareDocumentPosition(activityTitle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      activityTitle.compareDocumentPosition(chatTitle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(replyTitle.closest('.chat-panel')).toContainElement(chatTitle);
  });

  it('redirects to login when the API has no session in production', async () => {
    vi.stubEnv('DEV', false);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 })),
    );
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument(),
    );
  });
});
