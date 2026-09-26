import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authRequest, startPlatformConnection } from '../../lib/auth-client';

type Mode = 'sign-in' | 'sign-up';

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      await authRequest(mode === 'sign-in' ? 'sign-in/email' : 'sign-up/email', mode === 'sign-in' ? { email, password } : { name, email, password });
      navigate('/dashboard');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Connexion impossible');
    } finally { setBusy(false); }
  }

  async function connect(platform: 'twitch' | 'kick') {
    setMessage('');
    try { await startPlatformConnection(platform); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Liaison impossible'); }
  }

  return <main className="page auth-page">
    <p className="eyebrow">mstream · session locale</p>
    <h1>{mode === 'sign-in' ? 'Ouvrir la session' : 'Créer un compte local'}</h1>
    <p>Un compte local protège les tokens. Les identifiants Twitch et Kick restent côté API.</p>
    <form className="auth-form" onSubmit={submit} aria-label={mode === 'sign-in' ? 'Connexion' : 'Inscription'}>
      {mode === 'sign-up' && <label>Nom<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label>}
      <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      <label>Mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required /></label>
      <button type="submit" disabled={busy}>{busy ? 'Patientez…' : mode === 'sign-in' ? 'Se connecter' : 'Créer le compte'}</button>
    </form>
    <button className="secondary-button" type="button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage(''); }}>{mode === 'sign-in' ? 'Créer un compte' : 'J’ai déjà un compte'}</button>
    <section className="platform-connect" aria-labelledby="platform-connect-title">
      <h2 id="platform-connect-title">Lier une plateforme</h2>
      <p>Connectez-vous d’abord, puis autorisez chaque plateforme séparément.</p>
      <div className="platform-actions"><button type="button" onClick={() => void connect('twitch')}>Lier Twitch</button><button type="button" onClick={() => void connect('kick')}>Lier Kick</button></div>
    </section>
    {message && <p className="form-message" role="alert">{message}</p>}
    <nav aria-label="Navigation principale"><Link to="/">Accueil</Link><Link to="/help">Aide</Link></nav>
  </main>;
}
