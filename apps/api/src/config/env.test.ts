import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEnvironment } from './env';

test('environment validation accepts a PostgreSQL configuration', () => {
  assert.deepEqual(validateEnvironment({ DATABASE_URL: 'postgres://user:pass@localhost/db' }), {
    NODE_ENV: 'development',
    PORT: 3000,
    DATABASE_URL: 'postgres://user:pass@localhost/db',
  });
});

test('environment validation rejects non-PostgreSQL URLs', () => {
  assert.throws(() => validateEnvironment({ DATABASE_URL: 'sqlite://file.db' }), /PostgreSQL/);
});
