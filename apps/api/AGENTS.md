# `apps/api` — règles backend

## Responsabilité

`apps/api` est le seul point d’accès à PostgreSQL, Better Auth, Twitch et Kick. Il expose l’API HTTP et la gateway Socket.IO consommée par `apps/web`.

## Organisation recommandée

```text
src/
├── auth/                 # session applicative et callbacks OAuth
├── database/             # TypeORM, migrations, repositories
├── platform-connections/ # comptes liés, scopes, tokens chiffrés
├── platforms/
│   ├── twitch/            # OAuth, Helix, EventSub WebSocket
│   └── kick/              # OAuth, Public API, webhooks signés
├── live-session/          # chat/événements en mémoire
├── realtime/              # gateway Socket.IO
└── shared/                # erreurs, validation, configuration
```

## Règles spécifiques

- Un adapter de plateforme masque les différences Twitch/Kick.
- Les controllers restent minces ; la logique va dans services/use-cases.
- Les payloads externes sont validés avant mapping.
- Twitch : gérer welcome, keepalive, reconnexion, resouscription et déduplication EventSub.
- Kick : conserver le corps brut pour vérifier `Kick-Event-Signature`, dédupliquer avec `Kick-Event-Message-Id` et répondre rapidement.
- Les webhooks Kick ne doivent jamais faire confiance aux seuls headers de type/version.
- Les access tokens sont chargés uniquement côté service d’intégration et rafraîchis avant appel si nécessaire.
- Une session de live reste en mémoire ; aucune persistance d’événement sans mise à jour de la spec.
- Socket.IO ne transmet que des DTO/contracts sûrs, jamais des tokens ou secrets.

## Tests

- Unitaires : mapping, validation, crypto, idempotence et erreurs.
- Intégration : repositories TypeORM, OAuth callbacks, clients HTTP/WebSocket mockés.
- Webhooks : signature valide/invalide, replay, payload inconnu.
- E2E : API et gateway avec providers de test.

## Commandes

```bash
pnpm --filter @mstream/api test
pnpm --filter @mstream/api typecheck
pnpm --filter @mstream/api build
```

Ne jamais importer un composant React ou une dépendance de `apps/web` dans l’API.
