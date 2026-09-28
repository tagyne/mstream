import { afterEach, expect, it, vi } from 'vitest';
import { startPlatformConnection } from './auth-client';

afterEach(() => vi.unstubAllGlobals());

it('starts social sign-in when there is no session', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => null })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);

  await expect(startPlatformConnection('kick')).rejects.toThrow(
    'La connexion à la plateforme a échoué',
  );
  expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/sign-in/social', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'kick',
      callbackURL: `${window.location.origin}/dashboard?connected=kick`,
    }),
  });
});

it('links a second social account when an application session exists', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: 'local-user' } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);

  await expect(startPlatformConnection('twitch')).rejects.toThrow(
    'La connexion à la plateforme a échoué',
  );
  expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/link-social', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'twitch',
      callbackURL: `${window.location.origin}/dashboard?connected=twitch`,
    }),
  });
});
