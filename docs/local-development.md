# Développement local

## API et web

```bash
pnpm install
pnpm dev
```

L’API écoute sur `http://localhost:3000` et le web sur `http://localhost:5173`. Les secrets doivent être fournis via `.env.dev`, créé localement à partir de `.env.dev.example`; aucun secret ne doit être commité.

La page `/login` permet de créer un compte local ou de se connecter. Après connexion, les boutons Twitch/Kick appellent `/platform-connections/:platform/start`; le callback redirige vers `/dashboard`.

Pour vérifier l’API d’authentification sans plateforme externe :

```bash
curl -i -c /tmp/mstream-cookies.txt -X POST http://localhost:3000/api/auth/sign-up/email \
  -H 'content-type: application/json' \
  --data '{"name":"Smoke User","email":"smoke@example.test","password":"password-123"}'
curl -b /tmp/mstream-cookies.txt http://localhost:3000/api/auth/get-session
```

Les migrations PostgreSQL sont exécutées avec :

```bash
pnpm --filter @mstream/api migration:run
```

Le endpoint `GET /health` permet un smoke test. Le webhook Kick local est `POST /webhooks/kick`; il exige le corps brut et les headers de signature Kick. Aucun tunnel public n’est nécessaire pour les fixtures locales.

## Production locale

```bash
cp .env.prod.example .env.prod
pnpm prod:build
pnpm prod:up
```

Le fichier `.env.prod` reste local et doit contenir un secret aléatoire d’au moins 32 caractères pour Better Auth et le coffre de tokens. Les volumes Compose prod sont distincts de ceux du développement.

## Tunnel Kick nommé (opt-in)

Les tunnels ne sont pas démarrés par les commandes dev/prod normales. Après création de deux tunnels remotely-managed distincts et configuration du hostname/ingress vers `http://api:3000/webhooks/kick` dans Cloudflare, lancer :

```bash
docker compose --env-file .env.dev -f compose.dev.yaml -f compose.tunnel.dev.yaml up -d
docker compose --env-file .env.prod -f compose.prod.yaml -f compose.tunnel.prod.yaml up -d
```

`CLOUDFLARE_TUNNEL_TOKEN` doit rester uniquement dans `.env.dev` ou `.env.prod`. Ne pas réutiliser le token dev en production. Les overrides exigent la variable et ne sont jamais chargés implicitement.
