import { Link } from 'react-router-dom';

export function PublicPage({ title, children }: { title: string; children: string }) {
  return (
    <main className="page">
      <p className="eyebrow">mstream</p>
      <h1>{title}</h1>
      <p>{children}</p>
      <nav aria-label="Navigation principale">
        <Link to="/">Accueil</Link>
        {import.meta.env.DEV && <Link to="/dashboard">Dashboard</Link>}
        <Link to="/login">Connexion</Link>
        <Link to="/help">Aide</Link>
      </nav>
    </main>
  );
}
