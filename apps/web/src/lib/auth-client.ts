export type AuthUser = { id: string; name: string; email: string };

export async function authRequest<T>(path: string, body?: Record<string, string>): Promise<T> {
  const response = await fetch('/api/auth/' + path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    error?: { message?: string };
  };
  if (!response.ok)
    throw new Error(
      payload.error?.message ?? payload.message ?? 'La requête d’authentification a échoué',
    );
  return payload as T;
}

export async function startPlatformConnection(platform: 'twitch' | 'kick'): Promise<void> {
  const session = await getSession();
  const result = await authRequest<{ url?: string }>(session ? 'link-social' : 'sign-in/social', {
    provider: platform,
    callbackURL: `${window.location.origin}/dashboard?connected=${platform}`,
  });
  if (!result.url) throw new Error('La connexion à la plateforme a échoué');
  window.location.assign(result.url);
}

export async function getSession(): Promise<{ user: AuthUser } | null> {
  const response = await fetch('/api/auth/get-session', { credentials: 'include' });
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as { user?: AuthUser } | null;
  return payload?.user ? { user: payload.user } : null;
}
