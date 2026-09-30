import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './dashboard-page';
import { LoginPage } from './login-page';
import { PublicPage } from './public-page';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicPage
              title="Multistreaming, enfin lisible"
              children="Un espace local pour suivre Twitch et Kick depuis un seul écran."
            />
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/help"
          element={
            <PublicPage
              title="Aide"
              children="mstream ne produit ni ne diffuse la vidéo : OBS conserve cette responsabilité."
            />
          }
        />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
