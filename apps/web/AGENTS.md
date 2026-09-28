# `apps/web` — règles frontend

## Responsabilité

`apps/web` fournit les pages publiques statiques et le dashboard client temps réel. Il ne contacte jamais directement Twitch/Kick et ne manipule jamais leurs tokens.

## Organisation recommandée

```text
src/
├── pages/        # accueil, connexion, aide, dashboard
├── features/
│   ├── chat/
│   ├── activity/
│   ├── composer/
│   └── stream-settings/
├── components/   # primitives UI réutilisables (composants/ui)
├── lib/           # client API, Socket.IO, formatage
└── styles/
```

## Système visuel

- Les tokens de couleur, espacement, rayon et largeur sont définis dans `src/styles.css` sous forme de variables CSS sémantiques.
- Réutiliser `src/components/ui/` pour les contrôles partagés et les classes de surface (`.surface`, `.panel`, `.composer`) pour les conteneurs.
- Garder les états clavier, focus visible, désactivé et responsive cohérents avec les primitives communes.

## Règles spécifiques

- React fonctionnel, TypeScript strict, composants accessibles.
- Utiliser shadcn/ui pour les composants visuels et respecter son style existant.
- Les pages accueil/connexion/aide sont SSG ; le dashboard est CSR.
- Les données temps réel viennent de Socket.IO et sont typées par `packages/contracts`.
- Le chat est la zone principale ; le fil d’actualité reste séparé et sans popup.
- Afficher badge de plateforme, états vide/reconnexion, compteur de nouveaux messages et résultats d’envoi par plateforme.
- Par défaut, toutes les plateformes connectées sont sélectionnées dans le composeur ; l’utilisateur peut en désélectionner.
- Ne pas mettre de token OAuth dans les props, le bundle, les logs ou `localStorage`.
- Les erreurs partielles doivent rester visibles : un succès Twitch ne masque pas un échec Kick.

## Tests

- Tests composants pour chat, fil, composeur et états de connexion.
- Tests de routing pour SSG/CSR.
- E2E pour connexion, réception, envoi ciblé/multiple et mise à jour stream.

## Commandes

```bash
pnpm --filter @mstream/web test
pnpm --filter @mstream/web typecheck
pnpm --filter @mstream/web build
```

Ne jamais importer un module backend ou un client officiel Twitch/Kick directement dans le frontend.
