# Spec: Dashboard layout

## Objective

Réorganiser le dashboard pour correspondre au croquis fourni : une colonne gauche partagée entre les paramètres du stream en haut et le fil d’actualité en bas, et une colonne droite occupée par le chat. Le composeur « Répondre » reste au bas du panneau de chat.

### Décisions de layout

- Sur grand écran, le panneau de chat prend environ 44 % de la largeur et toute la hauteur disponible ; les deux panneaux de gauche se partagent le reste en deux zones de hauteur similaire.
- Le titre « Dashboard » et les états Twitch/Kick restent visibles dans une ligne compacte au-dessus des panneaux, comme validé pour cette implémentation.
- Sous le breakpoint mobile de 840 px, les panneaux s’empilent dans l’ordre paramètres, fil d’actualité, chat ; le composeur reste à la suite du chat.
- Les composants, formulaires, validations, données et comportements actuels sont conservés ; seul leur placement et leur dimensionnement changent.

## Tech Stack

React, TypeScript, React Router et CSS existants dans `apps/web`. Aucun nouveau package ni changement API.

## Commands

- Dev : `pnpm --filter @mstream/web dev`
- Build : `pnpm --filter @mstream/web build`
- Tests : `pnpm --filter @mstream/web test`
- Typecheck : `pnpm --filter @mstream/web typecheck`

## Project Structure

- `apps/web/src/pages/dashboard-page.tsx` : composition des panneaux.
- `apps/web/src/styles.css` : grille, tailles et adaptations responsive.
- `apps/web/src/app.test.tsx` et tests des panneaux : vérification du rendu existant.

## Code Style

Conserver les composants React existants et les classes CSS partagées. Exemple de composition visée :

```tsx
<div className="dashboard-layout">
  <aside className="dashboard-sidebar">
    <StreamSettings statuses={snapshot.statuses} />
    <ActivityPanel events={snapshot.events} />
  </aside>
  <ChatPanel
    messages={snapshot.messages}
    footer={<MessageComposer statuses={snapshot.statuses} />}
  />
</div>
```

## Testing Strategy

Vitest dans `apps/web`. Vérifier que chaque panneau apparaît une seule fois, que le chat conserve son composeur, et que le build/typecheck réussissent. Vérification visuelle à grand écran et en largeur mobile.

## Boundaries

- Always : garder les formulaires et états accessibles, les états de plateforme visibles et le layout utilisable sur mobile.
- Ask first : ajouter une dépendance, changer le flux d’authentification ou supprimer les informations de statut.
- Never : modifier les contrats API, masquer des contrôles existants ou supprimer/affaiblir un test.

## Success Criteria

- Sur grand écran, paramètres et fil occupent la colonne gauche ; le chat occupe la colonne droite.
- Le composeur est placé au bas du panneau de chat.
- Sur mobile, les trois zones restent lisibles et s’empilent sans chevauchement horizontal.
- Dans les paramètres du stream, les cases Twitch/Kick apparaissent au-dessus des champs ; Titre et Catégorie/ID occupent chacun une ligne entière.
- Les formulaires, statuts, contenu du chat et fil d’actualité restent fonctionnels.
- Les tests web, le typecheck et le build web passent.

## Open Questions

Aucune.
