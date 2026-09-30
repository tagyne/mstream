# Spec: Better Auth platform connections

## Objective

The local streamer signs in with Twitch or Kick and links the second platform through Better Auth's built-in social providers. Email/password authentication is disabled. Better Auth owns OAuth state, PKCE where required, linked accounts, encrypted provider tokens, and token refresh. The dashboard and platform adapters continue to receive a per-platform connection status and usable server-side tokens.

## Tech stack and commands

- NestJS 11, Better Auth 1.7, TypeORM 0.3, PostgreSQL, React.
- Build: `pnpm build`.
- API tests: `pnpm --filter @mstream/api test`; web tests: `pnpm --filter @mstream/web test`; E2E: `pnpm test:e2e`.
- Typecheck: `pnpm typecheck`.
- Development: `pnpm dev`.

## Project structure and interfaces

- `apps/api/src/auth.ts`: Better Auth instance and built-in `twitch`/`kick` social provider options.
- `apps/api/src/better-auth/`: TypeORM entities for `user`, `session`, `account`, `verification`, and `rateLimit`, matching the existing migration, plus the Nest module that registers them.
- `apps/api/src/platform-connections/`: only application status and access to linked account tokens for Twitch/Kick adapters. No custom OAuth authorization, callback, state, PKCE, token exchange, or refresh.
- `apps/web/src/lib/auth-client.ts`: uses `/api/auth/sign-in/social` for the first platform and `/api/auth/link-social` with the existing session for the second. The callback URL targets the web origin; provider redirect URIs target `/api/auth/callback/twitch` and `/api/auth/callback/kick` on the API origin.
- `docs/`: architecture and local setup guidance. `tasks/` is outside this change.

## Code style

```ts
@Entity({ name: 'account' })
export class BetterAuthAccount {
  @PrimaryColumn({ type: 'text' })
  id!: string;
}
```

Use strict TypeScript, kebab-case file names, explicit boundary types, and short functions. The API alone can read provider tokens.

## Testing strategy

API tests verify entity metadata against the migration, provider configuration, and account linking/token access with mocked Better Auth boundaries. Web tests verify the link request and redirect handling. Existing API/web/E2E tests and affected builds remain green; no test is weakened to accommodate the migration.

## Boundaries

- Always: preserve session protection, minimal provider scopes, encrypted tokens, per-platform results, and official APIs.
- Ask first: new external dependency, public route, or unrelated database schema change.
- Never: expose tokens to the browser, use private endpoints, or modify `tasks/`.

## Success criteria

1. `auth.ts` is directly under `apps/api/src/`; no `apps/api/src/auth/auth.ts` remains.
2. A `better-auth` Nest module registers TypeORM entities for every Better Auth table in the existing migration.
3. Both platforms use Better Auth's built-in social sign-in and account-link flows; custom OAuth routes, state handling, code exchange, and manual refresh are removed.
4. Platform commands and Twitch EventSub can use linked accounts without sending tokens to the browser.
5. `apps/api/src/config/`, `env.ts`, `env.test.ts`, and email/password UI/configuration are gone; required database and secret checks remain at the point of use.
6. Documentation, API/web tests, typecheck, and build verify the new flow. `tasks/` is untouched.

## Open questions

- Live OAuth with developer credentials requires an external integration run; local tests cover the flow using mocks.
