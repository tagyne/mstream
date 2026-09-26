import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBetterAuthTables1710000001000 implements MigrationInterface {
  name = 'CreateBetterAuthTables1710000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user" ("id" text NOT NULL PRIMARY KEY, "name" text NOT NULL, "email" text NOT NULL UNIQUE, "emailVerified" boolean NOT NULL, "image" text, "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "session" ("id" text NOT NULL PRIMARY KEY, "expiresAt" timestamptz NOT NULL, "token" text NOT NULL UNIQUE, "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, "updatedAt" timestamptz NOT NULL, "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "account" ("id" text NOT NULL PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, "updatedAt" timestamptz NOT NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "verification" ("id" text NOT NULL PRIMARY KEY, "identifier" text NOT NULL, "value" text NOT NULL, "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL)`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "rateLimit" ("id" text NOT NULL PRIMARY KEY, "key" text NOT NULL UNIQUE, "count" integer NOT NULL, "lastRequest" bigint NOT NULL)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "rateLimit"');
    await queryRunner.query('DROP TABLE IF EXISTS "verification"');
    await queryRunner.query('DROP TABLE IF EXISTS "account"');
    await queryRunner.query('DROP TABLE IF EXISTS "session"');
    await queryRunner.query('DROP TABLE IF EXISTS "user"');
  }
}
