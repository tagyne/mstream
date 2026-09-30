# Spec: préremplissage des paramètres de stream

## Objectif

Au chargement du dashboard, le bloc « Paramètres du stream » récupère le titre, la catégorie et son image actuellement configurés sur chaque plateforme liée. Ces valeurs restent accessibles même si la chaîne est hors ligne. L'utilisateur peut modifier les champs puis envoyer la mise à jour à la plateforme souhaitée.

## Hypothèses

- Les métadonnées de chaîne officielles sont la source de vérité, même hors live.
- Twitch et Kick ont des identifiants de catégorie distincts ; chaque brouillon conserve séparément l’identifiant, le nom et l’image.
- Le formulaire affiche les valeurs de la plateforme choisie via les cases à cocher déjà présentes, et conserve un brouillon distinct par plateforme.
- Les cases à cocher de destination restent disponibles ; chaque destination reçoit son propre brouillon.
- La recherche de catégories utilise l’API officielle de la plateforme active ; le navigateur ne contacte jamais Twitch/Kick directement.
- Le champ réutilisable Autocomplete s’appuie sur Combobox Base UI et affiche une miniature et le nom dans ses options et pour la catégorie sélectionnée.
- La recherche commence à trois caractères, attend 250 ms après la saisie et annule les requêtes devenues obsolètes.
- Le formulaire ne remplace pas une saisie en cours lorsqu'une requête se termine en retard.
- Un échec de lecture sur une plateforme n'empêche pas l'affichage des valeurs de l'autre.

## Contrat et structure

- `GET /commands/stream` (session obligatoire) renvoie un résultat par plateforme liée : `platform`, `status`, puis `title`, `categoryId`, `categoryName`, `categoryImageUrl` si connue en cas de succès, ou `message` en cas d'échec. Aucun jeton n'est renvoyé.
- `GET /commands/categories?platform=twitch|kick&query=...` (session obligatoire) valide la plateforme et une recherche de 3 à 100 caractères, puis renvoie `{ platform, categories: [{ id, name, imageUrl }], message? }`. Les catégories Twitch viennent de Helix Search Categories et celles de Kick de Categories V2. Les images non HTTPS sont rejetées côté API.
- `apps/api/src/twitch/twitch-helix.client.ts` lit `GET /helix/channels?broadcaster_id=...`.
- `apps/api/src/kick/kick-public-api.client.ts` lit `GET /public/v1/channels` avec le jeton utilisateur lié.
- `apps/api/src/platform-commands/` agrège les résultats indépendants derrière la session Better Auth.
- `packages/contracts/src/` définit le DTO partagé `StreamCategorySearchResult` et `StreamCategory`.
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
  categoryImageUrl: categoryImageUrl,
};
```

Les tests API simulent les réponses officielles Twitch/Kick et vérifient les erreurs partielles et l'absence de jeton dans le DTO. Les tests React vérifient le préremplissage avec image, le changement de plateforme, les recherches et sélections souris/clavier, les erreurs et la conservation des saisies.

## Limites

- Toujours : valider les réponses externes, lire les jetons côté API, garder les erreurs par plateforme et tester avant de conclure.
- Demander avant : nouvelle dépendance, migration, route réellement publique ou changement du modèle de session.
- Jamais : envoyer un jeton au navigateur, lire Twitch/Kick directement depuis React ou écraser une saisie utilisateur après une réponse tardive.

## Critères de réussite

1. Une plateforme liée fournit au formulaire son titre, sa catégorie et son image actuels, y compris hors live.
2. Les suggestions sont chargées depuis l’API officielle de la plateforme sélectionnée et affichent image et nom.
3. Une sélection affiche image/nom dans le champ et conserve l’ID correct pour la plateforme.
4. Twitch et Kick conservent chacun leur propre ID, nom et image de catégorie.
5. Si une lecture échoue, l'erreur de cette plateforme est visible et l'autre reste utilisable.
6. Une réponse tardive n'efface pas une modification en cours ni les suggestions d’une saisie plus récente.
7. Le bouton « Mettre à jour » envoie le brouillon propre à chaque plateforme cochée et indique le résultat par plateforme.
8. Les tests ciblés, le typage, le build, le lint et le formatage passent.

## Sources

- https://dev.twitch.tv/docs/api/reference/#get-channel-information
- https://github.com/KickEngineering/KickDevDocs/blob/main/apis/channels.md
- https://api.kick.com/swagger/doc.yaml
