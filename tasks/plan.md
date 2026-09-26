# Plan d’implémentation — Dashboard Multistream MVP

## Vue d’ensemble

Construire un monorepo pnpm avec `apps/api` NestJS et `apps/web` React. Le backend gère Better Auth, les connexions OAuth Twitch/Kick, les adapters de plateformes, les transports temps réel et la session mémoire. Le frontend affiche le chat, le fil d’actualité, les états de connexion et les commandes du stream.

## Décisions d’architecture

- Les plateformes sont isolées derrière `TwitchAdapter` et `KickAdapter`.
- Twitch utilise EventSub WebSocket ; Kick utilise Events API/Webhooks via Cloudflare Tunnel nommé.
- Les contrats unifiés sont partagés dans `packages/contracts`.
- Les tokens ne quittent jamais l’API et sont chiffrés en base.
- Le fil d’actualité et le chat sont en mémoire pendant la session uniquement.
- Les pages publiques sont SSG ; le dashboard est rendu côté client.
- Les envois multi-plateformes sont indépendants et retournent un résultat par plateforme.
- Le développement et la production locale utilisent deux configurations Docker Compose séparées.
- Les volumes PostgreSQL, variables d’environnement et tokens Cloudflare sont isolés entre les deux environnements.

## Dépendances

```text
workspace
  → identity
  → platform-adapters
  → realtime-contract
  → live-session
  → dashboard-ui
```

## Phases et tâches

### Phase 1 — Fondations et spike à risque

1. Scaffold du monorepo pnpm et des deux apps.
2. Ajouter l’environnement Docker de développement.
3. Ajouter l’environnement Docker de production locale.
4. Configurer PostgreSQL, TypeORM et les variables d’environnement.
5. Réaliser le spike OAuth Twitch/Kick et confirmer Better Auth.
6. Configurer le Cloudflare Tunnel nommé et le callback webhook Kick.

### Checkpoint 1

- Le workspace s’installe et se build.
- Les environnements Docker dev et prod local démarrent séparément.
- Les deux providers OAuth retournent une identité de test.
- Le webhook Kick reçoit une requête via hostname stable.
- Les décisions Better Auth et tunnel sont confirmées.

### Phase 2 — Contrats et intégration Twitch

7. Définir les contrats unifiés et le bus de session.
8. Implémenter Twitch EventSub WebSocket pour le chat et les événements.
9. Implémenter l’envoi Twitch et la mise à jour du stream.

### Checkpoint 2

- Un message Twitch arrive dans un flux normalisé.
- Une reconnexion EventSub ne crée pas de doublon.
- Un message et une mise à jour de titre Twitch sont testables de bout en bout.

### Phase 3 — Intégration Kick et résilience

10. Implémenter la réception et la vérification des webhooks Kick.
11. Implémenter l’envoi Kick, les catégories V2 et la mise à jour du stream.
12. Implémenter refresh token, états de connexion et erreurs par plateforme.

### Checkpoint 3

- Twitch et Kick alimentent le même modèle normalisé.
- Les signatures invalides et événements dupliqués sont rejetés.
- Un envoi aux deux plateformes rapporte séparément succès et échec.

### Phase 4 — Dashboard et validation utilisateur

13. Construire le shell SSG/CSR et les indicateurs de connexion.
14. Construire le chat unifié et le bouton de nouveaux messages.
15. Construire le fil d’actualité et le composeur multi-destinataires.
16. Construire le panneau titre/catégorie et les états vide/reconnexion.
17. Réaliser l’E2E d’un live Twitch + Kick et corriger les défauts bloquants.

### Checkpoint final

- Le parcours complet fonctionne sur une session réelle de test.
- Aucun secret n’est exposé au navigateur ou dans les logs.
- Build, typecheck, lint, tests unitaires, intégration et E2E passent.
- Le MVP respecte les exclusions de la spec.

## Risques et mitigations

| Risque | Impact | Mitigation |
|---|---:|---|
| Kick webhook indisponible en local direct | Élevé | Cloudflare Tunnel nommé, endpoint dédié et test de signature |
| Better Auth ne couvre pas exactement les connexions Twitch/Kick | Élevé | Spike OAuth avant le reste ; session Better Auth séparée de `platform_connections` si nécessaire |
| Scopes ou quotas changent | Élevé | Adapter isolé, scopes minimaux, tests contractuels et documentation officielle référencée |
| Doublons/reconnexions | Moyen | Idempotence par identifiant externe, état de transport et tests de replay |
| Catégories différentes entre plateformes | Moyen | Résoudre et stocker des IDs propres à chaque plateforme, jamais un ID partagé |
| Échec partiel d’un envoi multi-plateforme | Moyen | Résultat par destination et UX explicite |
| Pas d’historique persistant | Faible | Limite claire en mémoire, ajout ultérieur par migration dédiée |

## Parallelisation

- Après les contrats partagés, Twitch et Kick peuvent être développés en parallèle.
- Le frontend peut commencer sur des fixtures après validation des contrats.
- OAuth, migrations TypeORM et configuration du tunnel restent séquentiels.

## Garde-fou avant implémentation

La spec et ce plan doivent être relus et validés avant de lancer les tâches de code.

