# Spec: Platform icons in the web UI

## Objective

Use the supplied Twitch and Kick SVG wordmarks wherever the UI directly identifies an individual platform: connection actions and statuses, destination selectors, command results, chat messages, and activity events. The icon is the only visible platform identifier beside any status or result; keep its platform name available to assistive technology. Ordinary explanatory sentences remain text.

## Tech Stack

React and TypeScript in `apps/web`, with the existing SVG assets in `apps/web/src/assets/icons/`. No new dependency or API change.

## Commands

- Dev: `pnpm --filter @mstream/web dev`
- Build: `pnpm --filter @mstream/web build`
- Tests: `pnpm --filter @mstream/web test`
- Typecheck: `pnpm --filter @mstream/web typecheck`

## Project Structure

- `apps/web/src/assets/icons/twitch.svg` and `kick.svg`: supplied wordmarks.
- `apps/web/src/components/platform-icon.tsx`: shared typed icon renderer.
- `apps/web/src/pages/` and `apps/web/src/features/`: platform status, login, selectors, results, chat, and activity placements.
- Existing component tests in `apps/web/src/` cover placement and accessible names.

## Code Style

Map the shared `Platform` type to the imported SVG assets. Keep images decorative and expose accessible names on their enclosing control or platform badge:

```tsx
<label>
  <Checkbox aria-label={platform} checked={selected} onCheckedChange={onChange} />
  <PlatformIcon platform={platform} />
</label>
```

Use the project spacing and color tokens. Avoid duplicate visible labels beside the wordmarks. Login actions and platform badges retain accessible names.

## Testing Strategy

Use Vitest in `apps/web`. Verify both icon assets render in the shared component and each placement provides the platform name to assistive technology without rendering it as visible text. Run the full web tests, typecheck, and production build; inspect the UI in a browser at desktop and mobile widths.

## Boundaries

- Always: use the supplied SVGs, keep platform names accessible, preserve selection/status behavior and existing validation.
- Ask first: add dependencies, replace the supplied artwork, or change authentication/API behavior.
- Never: remove accessible names, weaken tests, or render redundant platform text beside the icons.

## Success Criteria

- Every UI element that directly identifies Twitch or Kick visually includes that platform's supplied icon without a visible duplicate name.
- Login buttons, connection statuses, both destination selectors, platform command results, chat messages, and activity events all use the shared mapping.
- Icons stay aligned and legible at desktop and mobile widths.
- Screen readers announce the platform name once for each labeled control or badge.
- The web tests, typecheck, and build pass.

## Open Questions

None.
