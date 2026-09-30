# mstream — règles globales du projet

## Mission

`mstream` est un dashboard local de multistreaming pour un streamer solo. Le MVP centralise Twitch et Kick : chat, événements, envoi de messages et mise à jour du titre/catégorie. L’application ne produit ni ne diffuse le rendu vidéo ; OBS ou un autre outil conserve cette responsabilité.

La source de vérité fonctionnelle est [docs/SPEC.md](docs/SPEC.md). Le travail est découpé dans [tasks/plan.md](tasks/plan.md) et [tasks/todo.md](tasks/todo.md).

## Architecture

```text
apps/web (React + React Router + shadcn/ui)
        │ HTTP + Socket.IO
        ▼
apps/api (NestJS)
 ├── Better Auth / sessions
 ├── Platform connections / encrypted tokens
 ├── Twitch adapter: EventSub WebSocket + Helix REST
 ├── Kick adapter: signed webhooks + Public API REST
 ├── Unified contracts / in-memory live session
 └── PostgreSQL via TypeORM
```

Workspace pnpm :

- `apps/api` : backend et intégrations externes.
- `apps/web` : interface et rendu public/dashboard.
- `packages/contracts` : types et contrats partagés, sans dépendance vers une application.

Environnements :

- `compose.dev.yaml` : hot reload, code monté, PostgreSQL dev, tunnel dev.
- `compose.prod.yaml` : images buildées, code non monté, volumes et variables prod locale séparés.

Twitch utilise EventSub WebSocket. Kick utilise Events API/Webhooks via un Cloudflare Tunnel nommé ; l’URL webhook Kick est configurée une fois dans le portail développeur.

## Règles globales

### Toujours

- Lire la spec et le package concerné avant de modifier du code.
- Utiliser pnpm workspace et les scripts root ; ne pas introduire npm/yarn.
- Garder les APIs Twitch/Kick derrière les adapters NestJS.
- Normaliser les payloads externes avant de les envoyer au frontend.
- Valider les entrées et typer les contrats.
- Exécuter les tests ciblés, le typecheck et le build affecté avant de conclure.
- Utiliser la configuration Prettier et ESLint commune à la racine pour `apps/api` et `apps/web` ; ne pas ajouter de règles locales divergentes.
- Formater avec `pnpm format` et vérifier avec `pnpm format:check` avant de conclure.
- Mettre à jour la spec ou le plan si une décision d’architecture change.
- Utiliser uniquement les APIs officielles documentées.

### Sécurité obligatoire

- Ne jamais exposer client secrets, access tokens ou refresh tokens au navigateur.
- Ne jamais stocker les tokens dans `localStorage` ou les logs.
- Chiffrer les tokens persistés côté API.
- Vérifier `state`/PKCE sur OAuth.
- Vérifier la signature et dédupliquer les webhooks Kick avec leur identifiant de message.
- Ne rendre public que le endpoint webhook nécessaire via Cloudflare Tunnel.
- Ne pas demander de scopes inutiles.
- Rapporter séparément les succès et échecs d’un envoi multi-plateforme.

### Limites

- Pas de rendu vidéo, OBS, analytics, historique permanent ou YouTube dans le MVP.
- Pas de scraping ni d’endpoint privé.
- Pas de nouvelle dépendance, migration DB, changement Compose ou route publique sans l’ajouter au plan et le signaler.
- Ne jamais supprimer/affaiblir un test pour obtenir un build vert.

## Style et conventions

- TypeScript strict.
- Noms de fichiers en kebab-case quand le framework le permet.
- Types et interfaces explicites aux frontières de packages.
- Fonctions courtes, responsabilités uniques, erreurs normalisées.
- Préférer les imports depuis les contrats partagés plutôt que recopier des types.
- Les commentaires expliquent une décision non évidente, pas le code ligne par ligne.

## Commandes de référence

```bash
pnpm install
pnpm dev
pnpm dev:down
pnpm dev:tunnel
pnpm prod:build
pnpm prod:up
pnpm prod:down
pnpm test
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm format
pnpm format:check
```

Docker doit être validé avec :

```bash
docker compose -f compose.dev.yaml config --quiet
docker compose -f compose.prod.yaml config --quiet
```

## Workflow agent

1. Lire `docs/SPEC.md`, puis le `AGENTS.md` du package ciblé.
2. Lire les fichiers sources et tests réellement concernés.
3. Modifier une tranche verticale petite et vérifiable.
4. Tester avant de passer à la tâche suivante.
5. Signaler les fichiers modifiés, les fichiers volontairement non touchés et les risques.

Les changements sont documentaires ou applicatifs ; ne pas créer de commit sans demande explicite.

## Convention de commits

Tous les commits suivent la convention Angular Commit :

```text
<type>(<scope>): <description impérative>

[corps optionnel]

[footer optionnel]
```

Types autorisés :

- `feat` : nouvelle fonctionnalité.
- `fix` : correction de bug.
- `docs` : documentation uniquement.
- `style` : formatage sans changement de comportement.
- `refactor` : restructuration sans ajout de fonctionnalité ni correction de bug.
- `perf` : amélioration des performances.
- `test` : ajout ou modification de tests.
- `build` : système de build ou dépendances de build.
- `ci` : intégration ou automatisation CI/CD.
- `chore` : maintenance ne touchant pas le code produit.
- `revert` : annulation d’un commit précédent.

Scopes recommandés : `workspace`, `api`, `web`, `contracts`, `auth`, `twitch`, `kick`, `docker`, `docs`.

Règles :

- Utiliser une description courte, impérative, sans point final.
- Garder un commit atomique : une intention logique par commit.
- Utiliser `!` ou un footer `BREAKING CHANGE:` pour une rupture de contrat.
- Ne pas mélanger refactor, formatage et fonctionnalité dans le même commit.

Exemples :

```text
feat(api): add Kick webhook signature validation
fix(web): preserve chat scroll position on new messages
docs(workspace): document local Docker environments
chore(docker): separate development and production volumes
feat(contracts)!: replace platform event type
```
