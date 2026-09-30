# Spec: préremplissage des paramètres de stream

## Objectif

Au chargement du dashboard, le bloc « Paramètres du stream » récupère le titre et la catégorie actuellement configurés sur chaque plateforme liée. Ces valeurs restent accessibles même si la chaîne est hors ligne. L'utilisateur peut modifier les champs puis envoyer la mise à jour à la plateforme souhaitée.

## Hypothèses

- Les métadonnées de chaîne officielles sont la source de vérité, même hors live.
- Twitch et Kick ont des identifiants de catégorie distincts ; les valeurs sont donc conservées séparément.
- Le formulaire affiche les valeurs de la plateforme choisie via les cases à cocher déjà présentes, et conserve un brouillon distinct par plateforme.
- Les cases à cocher de destination restent disponibles ; chaque destination reçoit son propre brouillon.
- Le formulaire ne remplace pas une saisie en cours lorsqu'une requête se termine en retard.
- Un échec de lecture sur une plateforme n'empêche pas l'affichage des valeurs de l'autre.

## Contrat et structure

- `GET /commands/stream` (session obligatoire) renvoie un résultat par plateforme liée : `platform`, `status`, puis `title`, `categoryId`, `categoryName` en cas de succès, ou `message` en cas d'échec. Aucun jeton n'est renvoyé.
- `apps/api/src/twitch/twitch-helix.client.ts` lit `GET /helix/channels?broadcaster_id=...`.
- `apps/api/src/kick/kick-public-api.client.ts` lit `GET /public/v1/channels` avec le jeton utilisateur lié.
- `apps/api/src/platform-commands/` agrège les résultats indépendants derrière la session Better Auth.
- `packages/contracts/src/` définit le DTO partagé.
- `apps/web/src/features/stream-settings/` charge et affiche les valeurs ; les tests restent proches des fichiers sources.
- `docs/` conserve cette décision et les critères de réussite.

## Commandes

- Tests API : `pnpm --filter @mstream/api test`
- Tests web : `pnpm --filter @mstream/web test`
- Typage : `pnpm typecheck`
- Build : `pnpm build`
- Format : `pnpm format && pnpm format:check`
- Lint : `pnpm lint`

## Style et tests

TypeScript strict et noms kebab-case. Les adapters normalisent les données externes en DTO explicites, par exemple :

```ts
return {
  platform: 'twitch',
  status: 'success',
  title: channel.title,
  categoryId: channel.game_id,
  categoryName: channel.game_name,
};
```

Les tests API simulent les réponses officielles Twitch/Kick et vérifient les erreurs partielles et l'absence de jeton dans le DTO. Les tests React vérifient le préremplissage, le changement de plateforme, les erreurs et la conservation des saisies.

## Limites

- Toujours : valider les réponses externes, lire les jetons côté API, garder les erreurs par plateforme et tester avant de conclure.
- Demander avant : nouvelle dépendance, migration, route réellement publique ou changement du modèle de session.
- Jamais : envoyer un jeton au navigateur, lire Twitch/Kick directement depuis React ou écraser une saisie utilisateur après une réponse tardive.

## Critères de réussite

1. Une plateforme liée fournit au formulaire son titre et sa catégorie actuels, y compris hors live.
2. Twitch et Kick conservent chacun leur propre ID de catégorie.
3. Si une lecture échoue, l'erreur de cette plateforme est visible et l'autre reste utilisable.
4. Une réponse tardive n'efface pas une modification en cours.
5. Le bouton « Mettre à jour » envoie le brouillon propre à chaque plateforme cochée et indique le résultat par plateforme.
6. Les tests ciblés, le typage, le build, le lint et le formatage passent.

## Sources

- https://dev.twitch.tv/docs/api/reference/#get-channel-information
- https://github.com/KickEngineering/KickDevDocs/blob/main/apis/channels.md
- https://api.kick.com/swagger/doc.yaml
