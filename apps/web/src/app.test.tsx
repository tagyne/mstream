import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './app';

describe('public application shell', () => {
  it('renders the local multistreaming landing page', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /multistreaming/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Connexion' })).toHaveAttribute('href', '/login');
  });
});

describe('login page', () => {
  it('renders Twitch and Kick sign-in actions', () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuer avec Twitch' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuer avec Kick' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /email/i })).not.toBeInTheDocument();
  });
});

describe('dashboard session guard', () => {
  it('redirects to login when the API has no session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 })),
    );
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument(),
    );
    vi.unstubAllGlobals();
  });
});
