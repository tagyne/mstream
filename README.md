# mstream

Dashboard local de multistreaming pour un streamer solo. mstream réunit Twitch et Kick dans une interface unique pour suivre les chats, consulter les événements importants, envoyer des messages et mettre à jour le titre ou la catégorie du stream.

mstream ne produit ni n'envoie la vidéo. OBS, ou un autre outil de diffusion, conserve cette responsabilité.

## État du projet

Le dépôt contient l'implémentation du MVP en cours de construction. Le périmètre fonctionnel, l'architecture et les limites sont décrits dans la [spécification principale](docs/SPEC.md). Les spécifications complémentaires documentent notamment l'authentification, la disposition du dashboard, les icônes de plateforme et le préremplissage des paramètres du stream.

## Fonctionnalités

- Connexion séparée des comptes Twitch et Kick avec OAuth.
- Statut indépendant pour chaque plateforme : connecté, déconnecté, reconnexion ou erreur.
- Chat unifié avec auteur, badges, horodatage et icône de plateforme.
- Fil d'activité pour les follows, abonnements, cadeaux, Cheers, KICKs et mises à jour de stream exposés par les APIs officielles.
- Réception Twitch via EventSub WebSocket.
- Réception Kick via Events API et webhooks signés.
- Envoi d'un message vers Twitch, Kick ou les deux, avec un résultat séparé par plateforme.
- Lecture du titre et de la catégorie actuels par plateforme.
- Recherche de catégories officielles avec image, nom et identifiant propre à la plateforme.
- Mise à jour du titre et de la catégorie avec résultats indépendants.
- Session live et historique du chat conservés en mémoire pendant l'exécution de l'API.
- Pages publiques d'accueil, de connexion et d'aide, puis dashboard client temps réel.

## Limites du MVP

- Aucun rendu vidéo, encodage, capture ou diffusion média.
- Pas de YouTube, d'analytics, de replay, de clips, de modération avancée ni de gestion d'OBS.
- Pas d'historique permanent des messages ou événements.
- Aucun scraping et aucune API privée ou non documentée.
- Les événements pris en charge dépendent de ce que Twitch et Kick exposent officiellement.

## Architecture

```text
apps/web (React + React Router + Vite)
        │ HTTP + Socket.IO
        ▼
apps/api (NestJS)
 ├── Better Auth et sessions
 ├── Connexions de plateformes et tokens chiffrés
 ├── Twitch : EventSub WebSocket + Helix REST
 ├── Kick : webhooks signés + Public API REST
 ├── Session live en mémoire
 └── PostgreSQL via TypeORM
        ▲
        │
packages/contracts (types et DTO normalisés)
```

Le frontend ne contacte jamais Twitch ou Kick directement. Les adapters du backend valident et normalisent les payloads externes avant de les transmettre à l'interface. Les tokens restent côté API.

### Packages

| Chemin               | Rôle                                                                      |
| -------------------- | ------------------------------------------------------------------------- |
| `apps/web`           | Interface React, pages publiques et dashboard temps réel                  |
| `apps/api`           | API NestJS, authentification, base de données et intégrations plateformes |
| `packages/contracts` | Types, DTO et fixtures partagés entre l'API et le frontend                |
| `docs`               | Spécifications et décisions fonctionnelles                                |

## Prérequis

- Node.js 24 ou version compatible avec l'image Docker du projet.
- pnpm 11.21.0, activé avec Corepack.
- Docker et Docker Compose pour l'environnement recommandé.
- Identifiants développeur Twitch et Kick pour tester les connexions OAuth.
- Un tunnel Cloudflare nommé uniquement pour recevoir les webhooks Kick depuis Internet.

Activez pnpm si nécessaire :

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

## Installation locale

Installez les dépendances à la racine :

```bash
pnpm install
```

Copiez l'environnement de développement et adaptez les secrets :

```bash
cp apps/api/.env.dev.example apps/api/.env.dev
```

Au minimum, renseignez dans `apps/api/.env.dev` :

- `BETTER_AUTH_SECRET` avec une valeur aléatoire d'au moins 32 caractères ;
- `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` ;
- `KICK_CLIENT_ID` et `KICK_CLIENT_SECRET`.

Les secrets ne doivent pas être commités. Les fichiers `.env.dev` et `.env.prod` sont ignorés par Git ; les fichiers `*.example` servent de modèles.

## Démarrage avec Docker Compose

### Développement

L'environnement de développement démarre PostgreSQL, l'API NestJS et le frontend Vite avec hot reload :

```bash
pnpm dev
```

Cette commande lance les applications directement. Pour utiliser les conteneurs de développement :

```bash
docker compose --env-file apps/api/.env.dev -f compose.dev.yaml up --build
```

Adresses par défaut :

- Frontend : `http://localhost:5173`
- API : `http://localhost:3000`
- Santé de l'API : `http://localhost:3000/health`
- PostgreSQL exposé localement : `localhost:5433`

Arrêt et nettoyage des conteneurs de développement :

```bash
docker compose --env-file apps/api/.env.dev -f compose.dev.yaml down
```

### Production locale

La production locale utilise des images buildées, aucun montage du code source et des volumes PostgreSQL séparés :

```bash
docker compose --env-file apps/api/.env.prod -f compose.prod.yaml up --build -d
```

Le frontend est servi sur `http://localhost:8080` par défaut et l'API sur `http://localhost:3000`. Pour arrêter cet environnement :

```bash
docker compose --env-file apps/api/.env.prod -f compose.prod.yaml down
```

Les données de développement et de production locale utilisent des volumes distincts : `mstream-dev-postgres` et `mstream-prod-postgres`.

### Tunnel Cloudflare pour Kick

Le tunnel est optionnel et ne doit être activé que lorsqu'un hostname public est configuré dans le portail développeur Kick. Ajoutez `CLOUDFLARE_TUNNEL_TOKEN` à l'environnement correspondant, puis lancez l'override :

```bash
docker compose \
  --env-file apps/api/.env.dev \
  -f compose.dev.yaml \
  -f compose.tunnel.dev.yaml \
  up --build
```

Configurez dans Kick l'URL webhook correspondant au hostname stable du tunnel. La configuration du webhook Kick reste une étape manuelle ; mstream ne l'enregistre pas dynamiquement.

## Configuration OAuth

Créez les applications développeur auprès des plateformes, puis déclarez les URLs de callback suivantes :

| Plateforme | Callback                                         |
| ---------- | ------------------------------------------------ |
| Twitch     | `http://localhost:3000/api/auth/callback/twitch` |
| Kick       | `http://localhost:3000/api/auth/callback/kick`   |

Les scopes sont demandés par l'API selon les fonctionnalités du MVP. Les credentials et tokens sont utilisés exclusivement côté backend ; ils ne doivent jamais apparaître dans le bundle web, les props React, `localStorage` ou les logs.

Pour Twitch, l'intégration utilise OAuth Authorization Code, Helix REST et EventSub WebSocket. Pour Kick, elle utilise OAuth Authorization Code avec PKCE, la Public API et des webhooks dont la signature et l'identifiant de message sont vérifiés avant traitement.

## Commandes utiles

Toutes les commandes se lancent depuis la racine avec pnpm :

```bash
pnpm dev            # API et frontend en mode watch
pnpm build          # build contracts, API puis frontend
pnpm lint           # lint et vérifications TypeScript
pnpm typecheck      # vérification TypeScript du workspace
pnpm test           # tests web
pnpm test:e2e       # tests API e2e puis tests web
pnpm format         # formatage Prettier
pnpm format:check   # vérification du formatage
```

Commandes ciblées :

```bash
pnpm --filter @mstream/api test
pnpm --filter @mstream/api typecheck
pnpm --filter @mstream/api build
pnpm --filter @mstream/web test
pnpm --filter @mstream/web typecheck
pnpm --filter @mstream/web build
pnpm --filter @mstream/contracts build
```

Validation des fichiers Compose :

```bash
docker compose --env-file apps/api/.env.dev -f compose.dev.yaml config --quiet
docker compose --env-file apps/api/.env.prod -f compose.prod.yaml config --quiet
```

Les migrations TypeORM de l'API peuvent être exécutées avec :

```bash
pnpm --filter @mstream/api migration:run
```

## API applicative

Les routes d'authentification sont fournies par Better Auth sous `/api/auth/*`. Les commandes de plateforme nécessitent une session applicative :

| Méthode | Route                                                  | Usage                                                |
| ------- | ------------------------------------------------------ | ---------------------------------------------------- |
| `GET`   | `/health`                                              | Vérifier que l'API répond                            |
| `GET`   | `/commands/stream`                                     | Lire le titre et la catégorie par plateforme         |
| `GET`   | `/commands/categories?platform=twitch\|kick&query=...` | Rechercher des catégories officielles                |
| `PATCH` | `/commands/stream`                                     | Mettre à jour le titre ou la catégorie               |
| `POST`  | `/commands/messages`                                   | Envoyer un message vers une ou plusieurs plateformes |

Les réponses de commandes préservent les résultats indépendants de chaque plateforme : un échec Kick ne masque pas un succès Twitch.

## Sécurité et données

- Les tokens OAuth sont gérés et chiffrés côté API par Better Auth.
- L'interface ne reçoit aucun access token ou refresh token.
- Les payloads Kick sont vérifiés avec `Kick-Event-Signature` et dédupliqués via `Kick-Event-Message-Id`.
- Les événements et messages de la session live restent en mémoire et sont perdus au redémarrage de l'API.
- PostgreSQL conserve les comptes, sessions, comptes OAuth et profils de stream nécessaires au fonctionnement.
- Les APIs privées, le scraping et les scopes inutiles sont exclus du projet.

## Développement

Les règles de contribution et de structure sont décrites dans [AGENTS.md](AGENTS.md), ainsi que dans les instructions propres à [l'API](apps/api/AGENTS.md), [l'interface web](apps/web/AGENTS.md) et [aux contrats](packages/contracts/AGENTS.md).

Avant une modification :

1. Lire [docs/SPEC.md](docs/SPEC.md) et le guide du package concerné.
2. Garder les APIs Twitch et Kick derrière les adapters NestJS.
3. Normaliser les payloads externes avant de les exposer au frontend.
4. Mettre à jour la spec lorsqu'une décision d'architecture change.
5. Formater avec Prettier et vérifier le typecheck, le build et les contrôles affectés.

Les changements documentaires ou applicatifs ne sont pas commités automatiquement.

## Documentation

- [Spécification MVP](docs/SPEC.md)
- [Connexions Better Auth](docs/SPEC-better-auth.md)
- [Disposition du dashboard](docs/SPEC-dashboard-layout.md)
- [Icônes de plateforme](docs/SPEC-platform-icons.md)
- [Préremplissage des paramètres du stream](docs/SPEC-stream-settings-prefill.md)
- [Documentation Twitch](https://dev.twitch.tv/docs/)
- [Documentation Kick](https://github.com/KickEngineering/KickDevDocs)

## Licence

Aucune licence open source n'est déclarée dans le dépôt pour le moment.
