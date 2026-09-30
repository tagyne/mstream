import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { startPlatformConnection } from '../lib/auth-client';

export function LoginPage() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function connect(platform: 'twitch' | 'kick') {
    setMessage('');
    setBusy(true);
    try {
      await startPlatformConnection(platform);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page auth-page">
      <p className="eyebrow">mstream · session locale</p>
      <h1>Connexion</h1>
      <p>
        Connectez-vous avec Twitch ou Kick. Une fois connecté, revenez ici pour lier l’autre
        plateforme.
      </p>
      <div className="platform-actions">
        <Button type="button" disabled={busy} onClick={() => void connect('twitch')}>
          Continuer avec Twitch
        </Button>
        <Button type="button" disabled={busy} onClick={() => void connect('kick')}>
          Continuer avec Kick
        </Button>
      </div>
      {message && (
        <p className="form-message" role="alert">
          {message}
        </p>
      )}
      <nav aria-label="Navigation principale">
        <Link to="/">Accueil</Link>
        {import.meta.env.DEV && <Link to="/dashboard">Dashboard sans connexion</Link>}
        <Link to="/help">Aide</Link>
      </nav>
    </main>
  );
}
