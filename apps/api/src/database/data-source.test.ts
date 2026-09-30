import assert from 'node:assert/strict';
import test from 'node:test';
import AppDataSource from './data-source';

test('runs pending database migrations during API startup', () => {
  assert.equal(AppDataSource.options.migrationsRun, true);
  assert.ok(AppDataSource.options.migrations?.length);
});
