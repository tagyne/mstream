import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required before initializing Better Auth');
}

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
  advanced: {
    disableCSRFCheck: false,
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  emailAndPassword: { enabled: true, disableSignUp: false, minPasswordLength: 8, autoSignIn: true },
  account: {
    encryptOAuthTokens: true,
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
  },
});
