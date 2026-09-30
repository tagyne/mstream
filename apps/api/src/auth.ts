import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { onPlatformAccountChanged } from './better-auth/platform-account-hooks';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required before initializing Better Auth');

const secret = process.env.BETTER_AUTH_SECRET;
if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) {
  throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters in production');
}

export const auth = betterAuth({
  appName: 'mstream',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  basePath: '/api/auth',
  secret,
  database: new Pool({ connectionString: databaseUrl }),
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  disabledPaths: ['/get-access-token', '/refresh-token', '/account-info'],
  advanced: { disableCSRFCheck: false, useSecureCookies: process.env.NODE_ENV === 'production' },
  socialProviders: {
    ...(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
      ? {
          twitch: {
            clientId: process.env.TWITCH_CLIENT_ID,
            clientSecret: process.env.TWITCH_CLIENT_SECRET,
            scope: [
              'user:read:chat',
              'user:write:chat',
              'channel:manage:broadcast',
              'moderator:read:followers',
              'channel:read:subscriptions',
              'bits:read',
            ],
          },
        }
      : {}),
    ...(process.env.KICK_CLIENT_ID && process.env.KICK_CLIENT_SECRET
      ? {
          kick: {
            clientId: process.env.KICK_CLIENT_ID,
            clientSecret: process.env.KICK_CLIENT_SECRET,
            scope: ['channel:read', 'channel:write', 'chat:write', 'events:subscribe'],
          },
        }
      : {}),
  },
  account: {
    encryptOAuthTokens: true,
    storeStateStrategy: 'database',
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
      trustedProviders: ['twitch', 'kick'],
    },
  },
  databaseHooks: {
    account: {
      create: { after: (account) => onPlatformAccountChanged(account) },
      update: { after: (account) => onPlatformAccountChanged(account) },
      delete: { after: (account) => onPlatformAccountChanged(account, true) },
    },
  },
  rateLimit: { enabled: true, storage: 'database' },
});
