# `packages/contracts` — règles des contrats partagés

## Responsabilité

Ce package contient les types, schémas et contrats partagés entre `apps/api` et `apps/web`. Il ne contient aucune logique de plateforme ni accès réseau.

## Règles spécifiques

- Les contrats représentent le modèle normalisé de l’application, pas les payloads bruts Twitch/Kick.
- Toute modification de contrat doit identifier ses consommateurs et mettre à jour les fixtures/tests.
- Utiliser des unions discriminées pour les plateformes, statuts et types d’événements.
- Les champs externes facultatifs restent facultatifs ; ne pas inventer de valeur par défaut silencieuse.
- Ne pas importer `apps/api`, `apps/web`, TypeORM, NestJS, React ou Socket.IO.
- Garder ce package portable et léger.

## Exemple

```ts
export type Platform = 'twitch' | 'kick';

export type PlatformStatus =
  | { platform: Platform; state: 'connected' }
  | { platform: Platform; state: 'disconnected' | 'reconnecting' | 'error'; message?: string };
```

## Tests

Tester les unions, schémas de validation et fixtures indépendamment des APIs externes.

```bash
pnpm --filter @mstream/contracts test
pnpm --filter @mstream/contracts typecheck
```
