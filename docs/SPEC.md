# Spécification — Dashboard Multistream MVP

## 1. Statut et objectif

**Statut :** proposition à valider avant implémentation.

Le projet est un dashboard local destiné à un streamer solo. Il centralise dans une interface unique les chats Twitch et Kick, les événements importants et l’envoi de messages vers une ou plusieurs plateformes. L’application ne produit jamais le rendu vidéo du stream : OBS ou un autre outil conserve cette responsabilité.

Le succès du MVP est atteint lorsque le streamer peut suivre les messages importants et les événements Twitch/Kick sans ouvrir les dashboards des plateformes, puis répondre depuis le dashboard avec un résultat distinct pour chaque plateforme.

## 2. Capability map

| Module | Responsabilité | Dépend de |
|---|---|---|
| `workspace` | Monorepo pnpm, applications, configuration locale | — |
| `identity` | Session applicative et liaison OAuth Twitch/Kick | `workspace` |
| `platform-adapters` | Clients Twitch/Kick, tokens, appels API et événements entrants | `identity` |
| `realtime-contract` | Modèles normalisés et diffusion Socket.IO | `platform-adapters` |
| `live-session` | Session de live en mémoire, chat, fil d’actualité et états de connexion | `realtime-contract` |
| `dashboard-ui` | Interface React, chat, fil, composeur et panneau stream | `identity`, `live-session` |

Ordre recommandé : `workspace` → `identity` → `platform-adapters` → `realtime-contract` → `live-session` → `dashboard-ui`.

## 3. Périmètre fonctionnel

### Inclus dans le MVP

- Connexion et liaison séparée des comptes Twitch et Kick via OAuth.
- État indépendant par plateforme : connecté, déconnecté, reconnexion, erreur.
- Chat unifié avec badge de plateforme, auteur, badges utilisateur, contenu et horodatage.
- Fil d’actualité séparé pour les follows, abonnements, cadeaux, Bits/Cheers Twitch et KICKs Kick lorsque l’API les expose.
- Envoi d’un message vers toutes les plateformes connectées par défaut.
- Sélection/désélection explicite des plateformes avant l’envoi.
- Résultat d’envoi par plateforme : succès, refus, limite, token expiré ou erreur réseau.
- Bouton/compteur « nouveaux messages » lorsque le streamer a remonté le chat.
- Mise à jour du titre et de la catégorie du stream, avec résultat par plateforme.
- Fil d’actualité conservé uniquement en mémoire pendant la session.
- Pages statiques pré-générées : accueil, connexion et aide.
- Dashboard rendu côté client pour les données OAuth et temps réel.

### Exclusions explicites

- Aucun rendu vidéo, encodage, capture ou diffusion média.
- YouTube dans le MVP.
- Historique permanent des messages ou événements.
- Analytics, replay, clips, modération avancée et gestion d’OBS.
- Scraping des sites Twitch/Kick et APIs privées/non documentées.
- Promesse générique de « dons » : seuls les événements officiellement exposés par chaque plateforme sont supportés.

## 4. Stack et architecture

### Stack retenue

- **Monorepo :** pnpm workspace.
- **Applications :** `apps/web` et `apps/api`.
- **Web :** React, React Router, shadcn/ui.
- **Rendu :** SSG pour les pages statiques ; rendu client pour le dashboard.
- **API :** NestJS.
- **Temps réel navigateur :** Socket.IO entre `apps/api` et `apps/web`.
- **Persistance :** PostgreSQL avec TypeORM.
- **Session/authentification applicative :** Better Auth, sous réserve de validation de l’intégration exacte avec les providers personnalisés.
- **Accès plateformes :** clients dédiés Twitch et Kick dans NestJS.
- **Tunnel local Kick :** Cloudflare Tunnel nommé avec hostname stable.
- **Conteneurisation :** Docker Compose distinct pour le développement local et la production locale.

Les versions exactes seront fixées lors du scaffold après vérification de la documentation officielle de chaque dépendance. Le dépôt actuel ne contient pas encore de `package.json`.

### Topologie

```text
apps/web (React + SSG/CSR)
        │ Socket.IO + API HTTP
        ▼
apps/api (NestJS)
 ├── Better Auth / sessions
 ├── Platform Connections / token vault
 ├── Twitch Adapter
 │    └── EventSub WebSocket + Helix REST
 ├── Kick Adapter
 │    └── Webhook public via Cloudflare Tunnel + REST
 ├── Unified Event Bus / session memory
 └── PostgreSQL via TypeORM
```

### Environnements Docker

Le projet fournit deux environnements explicitement séparés :

- `compose.dev.yaml` : développement local avec hot reload, montage contrôlé du code source, logs lisibles, PostgreSQL de développement et Cloudflare Tunnel de développement.
- `compose.prod.yaml` : production locale avec images multi-stage buildées, aucun montage du code source, variables de production séparées, healthchecks, volumes nommés et redémarrage automatique.

Les deux environnements utilisent des noms de projets Compose différents afin d’éviter de partager accidentellement les conteneurs, réseaux ou volumes. Les données PostgreSQL de développement et de production locale sont séparées. Le tunnel Cloudflare utilise une configuration et un token dédiés à l’environnement actif.

La production locale reste une installation monoposte : elle ne constitue pas encore une stratégie de déploiement cloud, de haute disponibilité ou de scaling horizontal.

Le frontend ne contacte jamais directement Twitch ou Kick. Les tokens et secrets restent côté API.

## 5. Utilisation officielle des APIs

### Twitch

Le backend utilise OAuth 2.0 Authorization Code pour obtenir un token utilisateur. EventSub WebSocket reçoit notamment `channel.chat.message`, `channel.chat.notification`, `channel.follow`, `channel.subscribe`, `channel.subscription.gift`, `channel.cheer` et `channel.update`. La connexion doit traiter le message de bienvenue, les keepalive, les reconnexions et les doublons.

L’envoi utilise `POST https://api.twitch.tv/helix/chat/messages`. La mise à jour du titre/catégorie utilise `PATCH https://api.twitch.tv/helix/channels` avec `channel:manage:broadcast`. Les scopes exacts doivent être demandés au minimum nécessaire, notamment `user:write:chat`, `user:read:chat`, `channel:manage:broadcast`, puis les scopes requis par les événements retenus.

Sources :

- https://dev.twitch.tv/docs/authentication/
- https://dev.twitch.tv/docs/eventsub/handling-websocket-events/
- https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/
- https://dev.twitch.tv/docs/chat/send-receive-messages/
- https://dev.twitch.tv/docs/api/reference
- https://dev.twitch.tv/docs/authentication/scopes/

### Kick

Le backend utilise OAuth 2.1 Authorization Code + PKCE avec `https://id.kick.com`. Les scopes MVP sont `user:read`, `channel:read`, `channel:write`, `chat:write` et `events:subscribe`.

La réception temps réel utilise l’Events API et des webhooks publics, notamment `chat.message.sent`, `channel.followed`, `channel.subscription.new`, `channel.subscription.renewal`, `channel.subscription.gifts`, `kicks.gifted`, `livestream.status.updated` et `livestream.metadata.updated`.

L’envoi utilise `POST https://api.kick.com/public/v1/chat`. La mise à jour des métadonnées utilise `PATCH https://api.kick.com/public/v1/channels`. La recherche de catégories doit utiliser Categories V2 ; les endpoints Categories V1 sont dépréciés.

Le webhook doit vérifier la signature `Kick-Event-Signature`, dédupliquer avec `Kick-Event-Message-Id` et répondre rapidement. Le hostname public sera fourni par un Cloudflare Tunnel nommé. Kick ne propose pas actuellement d’enregistrement dynamique documenté de l’URL webhook : sa configuration dans le portail développeur reste une étape initiale manuelle.

Sources :

- https://github.com/KickEngineering/KickDevDocs/blob/main/getting-started/generating-tokens-oauth2-flow.md
- https://github.com/KickEngineering/KickDevDocs/blob/main/scopes/scopes.md
- https://github.com/KickEngineering/KickDevDocs/blob/main/events/introduction.md
- https://github.com/KickEngineering/KickDevDocs/blob/main/events/event-types.md
- https://github.com/KickEngineering/KickDevDocs/blob/main/events/webhook-security.md
- https://github.com/KickEngineering/KickDevDocs/blob/main/apis/chat.md
- https://github.com/KickEngineering/KickDevDocs/blob/main/apis/channels.md
- https://github.com/KickEngineering/KickDevDocs/blob/main/apis/categories.md
- https://github.com/KickEngineering/KickDevDocs/issues/260

## 6. Modèle de données

### Données persistées

- `users` : identité applicative.
- Tables Better Auth : sessions et comptes liés.
- `platform_connections` : utilisateur, plateforme, identifiant externe, scopes accordés, expiration, refresh token chiffré, statut de connexion et dernière erreur.
- `stream_profiles` : identifiants de chaînes et configuration minimale nécessaire pour Twitch/Kick.

Les access tokens et refresh tokens sont chiffrés au repos. Aucun token ne doit être envoyé au navigateur.

### Données en mémoire

- `UnifiedMessage` : plateforme, identifiant externe, auteur, contenu, badges, timestamp.
- `UnifiedEvent` : plateforme, type, identifiant externe, acteur, métadonnées, timestamp.
- `PlatformStatus` : plateforme, statut, dernière transition, code d’erreur éventuel.
- `OutboundMessageResult` : plateforme, statut, identifiant distant éventuel, erreur normalisée.

Les messages et événements sont purgés à la fin de la session ou au redémarrage de l’API.

## 7. Contrats applicatifs

Les contrats partagés vivent dans un package du workspace, par exemple `packages/contracts`.

```ts
type Platform = 'twitch' | 'kick';

type UnifiedMessage = {
  platform: Platform;
  externalId: string;
  author: { id?: string; name: string; badges: string[] };
  content: string;
  createdAt: string;
};

type UnifiedEvent = {
  platform: Platform;
  type: 'follow' | 'subscription' | 'gift' | 'cheer' | 'kick' | 'stream-update';
  externalId: string;
  actor?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
```

Les événements entrants sont normalisés par les adapters. Le dashboard ne connaît ni les formats EventSub ni les payloads Kick.

## 8. Flux principaux

### Connexion d’une plateforme

1. L’utilisateur choisit Twitch ou Kick dans la page de connexion.
2. `apps/api` génère `state`, PKCE si requis, scopes minimaux et redirect URI.
3. La plateforme redirige vers le callback NestJS.
4. L’API échange le code, valide l’identité et chiffre les tokens.
5. L’API crée ou met à jour `platform_connections`.
6. L’API démarre le transport entrant de la plateforme.
7. Le frontend reçoit le nouvel état `connected` via Socket.IO.

### Réception d’un événement

```text
Twitch EventSub WebSocket / Kick Webhook
        ↓
Validation + déduplication
        ↓
Adapter de plateforme
        ↓
UnifiedMessage ou UnifiedEvent
        ↓
Session mémoire
        ↓
Socket.IO
        ↓
Chat ou fil d’actualité React
```

### Envoi multi-plateforme

Le frontend envoie le contenu et la liste des destinataires. L’API exécute une opération indépendante par plateforme connectée et renvoie un tableau de résultats. Un échec Kick ne doit pas annuler un envoi Twitch réussi.

### Mise à jour stream

Le formulaire envoie les changements souhaités par plateforme. L’API traduit le titre et la catégorie vers les identifiants spécifiques à Twitch/Kick, puis restitue un résultat indépendant.

## 9. Interface MVP

- Colonne principale : chat, messages récents, badges de plateforme, composeur.
- Colonne secondaire : fil d’actualité chronologique.
- Panneau supérieur : titre, catégorie, bouton de validation.
- Indicateurs persistants : Twitch/Kick connecté, déconnecté, reconnexion ou erreur.
- Pas de popup ni d’interruption du chat pour les alertes.
- État vide explicite pour chat et fil.
- Compteur/bouton de nouveaux messages lorsque le scroll n’est plus en bas.
- Destinataires du composeur cochés par défaut pour toutes les plateformes connectées.

## 10. Tests et critères de réussite

### Tests

- Unitaires : normalisation des payloads, validation OAuth state/PKCE, chiffrement, déduplication, mapping des erreurs.
- Intégration : repository TypeORM, callbacks OAuth, refresh/revocation, adapters avec clients HTTP mockés.
- Webhook : signature Kick valide/invalide, replay d’un même message, réponse rapide et événements inconnus.
- Temps réel : EventSub Twitch, reconnexion, resouscription et publication Socket.IO.
- E2E : connexion Twitch/Kick, chat entrant, fil d’événements, envoi ciblé/multiple et mise à jour du titre.

### Critères de réussite

- Une session peut connecter Twitch et Kick séparément.
- Un message entrant de chaque plateforme apparaît dans le chat avec le bon badge.
- Un événement entrant apparaît uniquement dans le fil d’actualité.
- Un message peut être envoyé à Twitch, Kick ou aux deux avec un résultat par plateforme.
- Une panne d’une plateforme n’interrompt pas l’autre.
- Un refresh token permet de maintenir la connexion sans intervention pendant un live.
- Les webhooks Kick invalides ou dupliqués ne modifient pas la session.
- Aucun secret de plateforme n’est présent dans le bundle web ou les logs.
- Le tunnel Cloudflare nommé démarre avec l’environnement local et l’URL reste stable.

## 11. Commandes proposées

Les scripts seront ajoutés lors du scaffold :

```bash
pnpm install
pnpm dev                         # lance compose.dev.yaml
pnpm dev:down
pnpm dev:tunnel
pnpm prod:build                  # build les images de production locale
pnpm prod:up                     # lance compose.prod.yaml
pnpm prod:down
pnpm prod:logs
pnpm build
pnpm test
pnpm test:e2e
pnpm lint
pnpm typecheck
```

Commandes Docker équivalentes documentées :

```bash
docker compose -f compose.dev.yaml up --build
docker compose -f compose.dev.yaml down
docker compose -f compose.prod.yaml build
docker compose -f compose.prod.yaml up -d
docker compose -f compose.prod.yaml down
```

## 12. Contraintes et frontières

### Toujours faire

- Valider les entrées côté API.
- Demander uniquement les scopes nécessaires.
- Chiffrer les tokens persistés.
- Vérifier les signatures Kick et dédupliquer les événements.
- Tester les adapters sans dépendre des APIs en production.
- Afficher les erreurs par plateforme.

### Demander avant de faire

- Ajouter une plateforme.
- Ajouter une dépendance majeure.
- Modifier le schéma PostgreSQL.
- Ajouter de la persistance au fil de session.
- Exposer une nouvelle route publiquement.

### Ne jamais faire

- Stocker un token dans React, localStorage ou les logs.
- Utiliser une API privée ou du scraping.
- Désactiver la validation de signature webhook.
- Masquer un échec partiel d’envoi.
- Retirer un test ou affaiblir une validation pour obtenir un build vert.

## 13. Points à valider avant implémentation

- [ ] Compatibilité exacte de Better Auth avec deux connexions OAuth de plateformes distinctes et stockage des scopes/tokens requis.
- [ ] Domaine Cloudflare disponible et zone gérée par Cloudflare.
- [ ] Création/configuration des applications développeur Twitch et Kick.
- [ ] Validation pratique des scopes et abonnements EventSub/Kick sur les comptes de test.
- [ ] Stratégie locale PostgreSQL : service natif ou Docker.
- [ ] Noms des fichiers Compose et stratégie de gestion des secrets locaux.
- [ ] Image de service retenue pour servir le build SSG du frontend en production locale.
- [ ] Framework de test retenu pour le workspace.

