import assert from 'node:assert/strict';
import test from 'node:test';
import { getMetadataArgsStorage } from 'typeorm';
import { betterAuthEntities } from './better-auth.module';

test('Better Auth entities cover every table and column in the existing migration', () => {
  const expected = {
    user: ['id', 'name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt'],
    session: [
      'id',
      'expiresAt',
      'token',
      'createdAt',
      'updatedAt',
      'ipAddress',
      'userAgent',
      'userId',
    ],
    account: [
      'id',
      'accountId',
      'providerId',
      'userId',
      'accessToken',
      'refreshToken',
      'idToken',
      'accessTokenExpiresAt',
      'refreshTokenExpiresAt',
      'scope',
      'password',
      'createdAt',
      'updatedAt',
    ],
    verification: ['id', 'identifier', 'value', 'expiresAt', 'createdAt', 'updatedAt'],
    rateLimit: ['id', 'key', 'count', 'lastRequest'],
  };
  const metadata = getMetadataArgsStorage();
  for (const entity of betterAuthEntities) {
    const table = metadata.tables.find((entry) => entry.target === entity)
      ?.name as keyof typeof expected;
    assert.ok(table && expected[table], `Unexpected table for ${entity.name}`);
    assert.deepEqual(
      metadata.columns
        .filter((column) => column.target === entity)
        .map((column) => column.propertyName)
        .sort(),
      expected[table].sort(),
    );
  }
  assert.equal(betterAuthEntities.length, Object.keys(expected).length);
});
