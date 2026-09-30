import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlatformIcon } from '../components/platform-icon';
import { ActivityPanel } from '../features/activity/activity-panel';
import { ChatPanel } from '../features/chat/chat-panel';
import { MessageComposer } from '../features/composer/message-composer';
import { StreamSettings } from '../features/stream-settings/stream-settings';
import { getSession } from '../lib/auth-client';
import { useLiveSession } from '../hooks/use-live-session';

function AuthenticatedDashboard() {
  const snapshot = useLiveSession();

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">session locale</p>
          <h1>Dashboard</h1>
          <Link to="/login">Lier une plateforme</Link>
        </div>
        <div className="status-list" aria-label="État des plateformes">
          {(['twitch', 'kick'] as const).map((platform) => {
            const status = snapshot.statuses.find((item) => item.platform === platform);
            return (
              <span
                key={platform}
                className={`status ${status?.state === 'connected' ? 'status-online' : 'status-offline'}`}
                role="img"
                aria-label={`${platform} · ${status?.state ?? 'déconnecté'}`}
              >
                <PlatformIcon platform={platform} />
                <span>{status?.state ?? 'déconnecté'}</span>
              </span>
            );
          })}
        </div>
      </header>
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar" aria-label="Paramètres et actualité">
          <StreamSettings statuses={snapshot.statuses} />
          <ActivityPanel events={snapshot.events} />
        </aside>
        <ChatPanel
          messages={snapshot.messages}
          footer={<MessageComposer statuses={snapshot.statuses} />}
        />
      </div>
    </main>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(import.meta.env.DEV);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    let active = true;
    void getSession()
      .then((session) => {
        if (!session) {
          navigate('/login', { replace: true });
          return;
        }
        if (active) setChecked(true);
      })
      .catch(() => navigate('/login', { replace: true }));
    return () => {
      active = false;
    };
  }, [navigate]);

  if (!checked)
    return (
      <main className="page">
        <p role="status">Vérification de la session…</p>
      </main>
    );
  return <AuthenticatedDashboard />;
}
