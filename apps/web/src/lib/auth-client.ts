export type AuthUser = { id: string; name: string; email: string };

export async function authRequest<T>(path: string, body?: Record<string, string>): Promise<T> {
  const response = await fetch('/api/auth/' + path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({})) as { message?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? payload.message ?? 'La requête d’authentification a échoué');
  return payload as T;
}

export async function startPlatformConnection(platform: 'twitch' | 'kick'): Promise<void> {
  const response = await fetch('/platform-connections/' + platform + '/start', { credentials: 'include' });
  const payload = await response.json().catch(() => ({})) as { url?: string; message?: string };
  if (!response.ok || !payload.url) throw new Error(payload.message ?? 'La session applicative est requise');
  window.location.assign(payload.url);
}


export async function getSession(): Promise<{ user: AuthUser } | null> {
  const response = await fetch('/api/auth/get-session', { credentials: 'include' });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as { user?: AuthUser } | null;
  return payload?.user ? { user: payload.user } : null;
}
