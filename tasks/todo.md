# Tâches — Dashboard Multistream MVP

## Phase 1 — Fondations et spike à risque

### Task 1 — Scaffolder le monorepo pnpm

**Description :** créer `apps/api`, `apps/web` et `packages/contracts` avec les scripts workspace de base et Vitest.

**Acceptance criteria:**
- [x] `pnpm install` fonctionne depuis la racine.
- [x] `apps/api` démarre NestJS et `apps/web` démarre React.
- [x] Les scripts `dev`, `build`, `test`, `lint` et `typecheck` sont définis.
- [x] Vitest est configuré uniquement dans apps/web avec `test:watch` et `test:coverage`.
- [x] Aucun package, script ou test API n’utilise Vitest.

**Verification:** `pnpm install && pnpm build && pnpm typecheck`.

**Dependencies:** Aucune.

**Files likely touched:** `package.json`, `pnpm-workspace.yaml`, `apps/api/*`, `apps/web/*`, `packages/contracts/*`.

**Estimated scope:** Medium.

### Task 2 — Configurer PostgreSQL, TypeORM et la configuration locale

**Acceptance criteria:**
- [x] Les variables d’environnement sont documentées sans secret commité.
- [x] NestJS peut ouvrir une connexion PostgreSQL.
- [x] Les migrations TypeORM sont exécutables.

**Verification:** migration sur une base de test et test de connexion.

**Dependencies:** Task 1.

**Files likely touched:** `apps/api/src/database/*`, `.env.example`, `package.json`.

**Estimated scope:** Medium.

### Task 3 — Ajouter l’environnement Docker de développement

**Description :** fournir la configuration Docker Compose de développement avec hot reload, PostgreSQL dédié et montage contrôlé du code source.

**Acceptance criteria:**
- [x] `compose.dev.yaml` supporte le développement avec hot reload et PostgreSQL dédié.
- [x] Le projet Compose de développement possède un nom, un réseau et un volume PostgreSQL dédiés.
- [x] Les services possèdent des healthchecks et les variables sont documentées dans des fichiers d’exemple.

**Verification:** `docker compose -f compose.dev.yaml config --quiet`, puis démarrage/arrêt de l’environnement dev.

**Dependencies:** Task 1.

**Files likely touched:** `compose.dev.yaml`, `Dockerfile.dev`, `.dockerignore`, `.env.dev.example`, `package.json`.

**Estimated scope:** Medium.

### Task 4 — Ajouter l’environnement Docker de production locale

**Description :** fournir une configuration Docker Compose de production locale avec images buildées, aucun montage du code source et données isolées du développement.

**Acceptance criteria:**
- [x] `compose.prod.yaml` utilise des images multi-stage buildées et aucun montage du code source.
- [x] Les volumes PostgreSQL et variables de production sont distincts de l’environnement dev.
- [x] Les services possèdent des healthchecks et une politique de redémarrage adaptée à une installation locale.
- [x] Le build SSG du frontend est servi par l’image de production prévue.

**Verification:** `docker compose -f compose.prod.yaml config --quiet`, build des images, démarrage/arrêt et test HTTP de santé.

**Dependencies:** Task 3.

**Files likely touched:** `compose.prod.yaml`, `Dockerfile.prod`, `.env.prod.example`, configuration du serveur statique web.

**Estimated scope:** Medium.
### Task 5 — Valider Better Auth, son adaptateur NestJS et les deux connexions OAuth

**Acceptance criteria:**
- [x] Le callback Twitch fonctionne avec state et scopes minimaux.
- [x] Le callback Kick fonctionne avec OAuth 2.1 + PKCE.
- [x] @thallesp/nestjs-better-auth est intégré via AuthModule et AuthGuard.
- [x] Les tokens ne sont jamais retournés au navigateur.
- [x] La décision d’architecture Better Auth/platform connections est documentée.

**Verification:** test d’intégration OAuth mocké + connexion réelle sur comptes de développement.

**Dependencies:** Tasks 1-2.

**Files likely touched:** `apps/api/src/auth/*`, `apps/api/src/platform-connections/*`, `.env.example`.

**Estimated scope:** Large, à découper si le spike dépasse une session.

### Task 6 — Préparer le webhook Kick local et ses fixtures signées

**Acceptance criteria:**
- [x] L’endpoint webhook Kick fonctionne sur l’API locale sans exposition publique.
- [x] Une fixture signée valide est acceptée et une fixture invalide est rejetée.
- [x] Aucun DNS Cloudflare n’est nécessaire.

**Verification:** tests du module API avec fixtures locales ; le framework de test API reste distinct de Vitest web.

**Dependencies:** Tasks 1, 3.

**Files likely touched:** `apps/api/src/platforms/kick/webhooks/*`, `tests/fixtures/kick/*`, `docs/local-development.md`.

**Estimated scope:** Small.

## Checkpoint 1 — Fondations

- [ ] Tasks 1 à 6 validées.
- [ ] OAuth confirmé et webhook local testé avec fixtures ; aucun tunnel n’est requis.
- [x] Aucun secret présent dans Git.

## Phase 2 — Contrats et Twitch

### Task 7 — Définir les contrats unifiés et la session mémoire

**Acceptance criteria:**
- [x] Les types `UnifiedMessage`, `UnifiedEvent`, `PlatformStatus` et `OutboundMessageResult` sont partagés.
- [x] La session mémoire purge ses messages/événements à l’arrêt.
- [x] Les fixtures Twitch/Kick sont disponibles pour le frontend.

**Verification:** tests unitaires de normalisation et purge.

**Dependencies:** Task 1.

**Files likely touched:** `packages/contracts/*`, `apps/api/src/live-session/*`, `packages/fixtures/*`.

**Estimated scope:** Medium.

### Task 8 — Implémenter Twitch EventSub WebSocket

**Acceptance criteria:**
- [x] Le socket Twitch est ouvert côté API, jamais côté navigateur.
- [x] Chat et événements MVP sont convertis en contrats unifiés.
- [x] Keepalive, reconnexion, resouscription et déduplication sont testés.

**Verification:** tests avec WebSocket mocké et test réel EventSub.

**Dependencies:** Tasks 5, 7.

**Files likely touched:** `apps/api/src/platforms/twitch/*`, `apps/api/src/event-ingestion/*`.

**Estimated scope:** Large, à découper en transport puis mapping.

### Task 9 — Implémenter les commandes Twitch

**Acceptance criteria:**
- [x] Un message peut être envoyé avec `user:write:chat`.
- [x] Le titre et le jeu peuvent être mis à jour avec `channel:manage:broadcast`.
- [x] Les erreurs API et expirations de token sont normalisées.

**Verification:** tests HTTP mockés et test réel sur chaîne de développement.

**Dependencies:** Tasks 5, 7.

**Files likely touched:** `apps/api/src/platforms/twitch/*`, tests associés.

**Estimated scope:** Medium.

## Checkpoint 2 — Twitch

- [x] Un message Twitch arrive dans la session et Socket.IO.
- [x] Une reconnexion ne duplique pas l’événement.
- [x] Envoi et mise à jour Twitch fonctionnent.

## Phase 3 — Kick et résilience

### Task 10 — Implémenter les webhooks Kick sécurisés

**Acceptance criteria:**
- [x] `chat.message.sent` et les événements MVP sont reçus.
- [x] La signature est vérifiée sur le corps brut.
- [x] Les `Kick-Event-Message-Id` déjà traités sont ignorés.
- [x] Les événements inconnus sont acquittés sans casser le pipeline.

**Verification:** tests de signature valide/invalide, replay et payload inconnu.

**Dependencies:** Tasks 6, 7.

**Files likely touched:** `apps/api/src/platforms/kick/webhooks/*`, `apps/api/src/platforms/kick/*`.

**Estimated scope:** Large, à découper en endpoint/sécurité puis mapping.

### Task 11 — Implémenter les commandes Kick et Categories V2

**Acceptance criteria:**
- [x] Un message peut être envoyé avec `chat:write`.
- [x] Le titre et la catégorie peuvent être mis à jour avec `channel:write`.
- [x] La recherche de catégorie utilise Categories V2.

**Verification:** tests HTTP mockés et test réel Kick.

**Dependencies:** Tasks 5, 7, 10.

**Files likely touched:** `apps/api/src/platforms/kick/*`, tests associés.

**Estimated scope:** Medium.

### Task 12 — Gérer refresh, reconnexion et statuts par plateforme

**Acceptance criteria:**
- [x] Chaque plateforme possède un statut indépendant.
- [x] Un refresh réussi maintient la connexion.
- [x] Un token invalide produit un statut actionnable.
- [x] La panne Kick ne coupe pas Twitch et inversement.

**Verification:** tests d’expiration, refresh, panne réseau et reprise.

**Dependencies:** Tasks 8-11.

**Files likely touched:** `apps/api/src/platform-connections/*`, `apps/api/src/platforms/*`, `apps/api/src/realtime/*`.

**Estimated scope:** Large, à découper par cycle de vie et publication d’état.

## Checkpoint 3 — Backend complet

- [x] Twitch et Kick produisent les mêmes contrats unifiés.
- [x] Webhooks Kick sécurisés et idempotents.
- [x] Envoi multi-plateforme avec résultat indépendant.

## Phase 4 — Dashboard

### Task 13 — Construire le shell React SSG/CSR

**Acceptance criteria:**
- [x] Accueil, connexion et aide sont pré-générés.
- [x] Le dashboard est chargé côté client.
- [x] Le routing et les états de chargement/erreur sont accessibles.

**Verification:** build web et test de navigation.

**Dependencies:** Task 1.

**Files likely touched:** `apps/web/src/routes/*`, `apps/web/src/app/*`, configuration React Router.

**Estimated scope:** Medium.

### Task 14 — Construire le chat unifié

**Acceptance criteria:**
- [x] Les messages affichent le badge Twitch/Kick.
- [x] Le scroll conserve la position de lecture.
- [x] Un compteur permet de revenir aux nouveaux messages.
- [x] L’état vide et l’état de reconnexion sont visibles.

**Verification:** tests composants avec fixtures et test manuel avec flux entrant.

**Dependencies:** Tasks 7, 12, 13.

**Files likely touched:** `apps/web/src/features/chat/*`, `apps/web/src/components/*`.

**Estimated scope:** Medium.

### Task 15 — Construire le fil d’actualité

**Acceptance criteria:**
- [x] Les événements sont triés du plus récent au plus ancien.
- [x] Les types d’événements ont une distinction visuelle.
- [x] Aucun événement ne déclenche de popup ou d’interruption du chat.
- [x] Le fil est limité à la session.

**Verification:** tests composants avec fixtures et test de purge/reconnexion.

**Dependencies:** Tasks 7, 12, 13.

**Files likely touched:** `apps/web/src/features/activity/*`, `apps/web/src/components/*`.

**Estimated scope:** Medium.

### Task 16 — Construire le composeur multi-destinataires et panneau stream

**Acceptance criteria:**
- [x] Toutes les plateformes connectées sont sélectionnées par défaut.
- [x] L’utilisateur peut désélectionner une plateforme.
- [x] Le résultat est affiché par plateforme.
- [x] Titre/catégorie sont modifiables et rapportent un résultat par plateforme.

**Verification:** tests composants et E2E avec API mockée.

**Dependencies:** Tasks 9, 11-15.

**Files likely touched:** `apps/web/src/features/composer/*`, `apps/web/src/features/stream-settings/*`.

**Estimated scope:** Medium.

### Task 17 — Parcours E2E et hardening du MVP local

**Acceptance criteria:**
- [x] Connexion, réception, fil, envoi et mise à jour sont couverts.
- [x] Les secrets et tokens n’apparaissent pas dans les bundles/logs.
- [x] Build, lint, typecheck et tests passent.
- [x] Le webhook est vérifié avec fixtures locales, sans Cloudflare.

**Verification:** `pnpm --filter @mstream/web test`, `pnpm test:e2e`, `pnpm build`, `pnpm lint`, `pnpm typecheck` et la commande de tests API retenue.

**Dependencies:** Tasks 1-16.

**Files likely touched:** `e2e/*`, configuration tests, documentation.

**Estimated scope:** Large, à découper si nécessaire.

## Checkpoint MVP local

- [ ] Tous les critères de la spec sont satisfaits.
- [ ] Le MVP fonctionne avec Twitch et Kick sur une session réelle.
- [x] Le plan d’implémentation est mis à jour avec les écarts constatés.
- [ ] Revue humaine avant ajout de YouTube ou de l’historique permanent.

## Phase 5 — Exposition Kick finale

### Task 18 — Configurer le Cloudflare Tunnel nommé

**Description :** exposer publiquement le webhook Kick uniquement après validation du MVP local.

**Acceptance criteria:**
- [ ] DNS et tunnel nommé avec hostname stable.
- [ ] Token Cloudflare dans un secret local non commité.
- [ ] Webhook Kick public avec validation de signature conservée.
- [ ] Dev et prod local utilisent des identifiants séparés.

**Verification:** test HTTP public puis événement Kick réel.

**Dependencies:** Task 17.

**Estimated scope:** Medium.

## Checkpoint de livraison

- [ ] Task 18 validée.
