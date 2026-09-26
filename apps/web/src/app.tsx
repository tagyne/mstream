import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom';
import './styles.css';
import { useLiveSession } from './lib/use-live-session';
import { ActivityPanel } from './features/activity/activity-panel';
import { ChatPanel } from './features/chat/chat-panel';
import { MessageComposer } from './features/composer/message-composer';
import { StreamSettings } from './features/stream-settings/stream-settings';
import { LoginPage } from './features/auth/login-page';
import { getSession } from './lib/auth-client';
import { useEffect, useState } from 'react';

function PublicPage({ title, children }: { title: string; children: string }) {
  return (
    <main className="page">
      <p className="eyebrow">mstream</p>
      <h1>{title}</h1>
      <p>{children}</p>
      <nav aria-label="Navigation principale">
        <Link to="/">Accueil</Link>
        <Link to="/login">Connexion</Link>
        <Link to="/help">Aide</Link>
      </nav>
    </main>
  );
}

function AuthenticatedDashboard() {
  const snapshot = useLiveSession();
  return <main className="dashboard">
    <header className="dashboard-header"><div><p className="eyebrow">session locale</p><h1>Dashboard</h1></div><div className="status-list" aria-label="État des plateformes">{(['twitch', 'kick'] as const).map((platform) => { const status = snapshot.statuses.find((item) => item.platform === platform); return <span key={platform} className={`status ${status?.state === 'connected' ? 'status-online' : 'status-offline'}`}>{platform} · {status?.state ?? 'déconnecté'}</span>; })}</div></header>
    <section className="dashboard-grid"><ChatPanel messages={snapshot.messages} /><ActivityPanel events={snapshot.events} /></section>
    <MessageComposer statuses={snapshot.statuses} />
    <StreamSettings statuses={snapshot.statuses} />
  </main>;
}

function Dashboard() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    let active = true;
    void getSession().then((session) => {
      if (!session) { navigate('/login', { replace: true }); return; }
      if (active) setChecked(true);
    }).catch(() => navigate('/login', { replace: true }));
    return () => { active = false; };
  }, [navigate]);
  if (!checked) return <main className="page"><p role="status">Vérification de la session…</p></main>;
  return <AuthenticatedDashboard />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicPage title="Multistreaming, enfin lisible" children="Un espace local pour suivre Twitch et Kick depuis un seul écran." />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/help" element={<PublicPage title="Aide" children="mstream ne produit ni ne diffuse la vidéo : OBS conserve cette responsabilité." />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
