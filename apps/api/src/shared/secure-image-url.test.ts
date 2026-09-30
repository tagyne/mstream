import assert from 'node:assert/strict';
import test from 'node:test';
import { secureImageUrl } from './secure-image-url';

test('secureImageUrl preserves valid HTTPS image addresses', () => {
  assert.equal(secureImageUrl('https://img.test/category.jpg'), 'https://img.test/category.jpg');
});

test('secureImageUrl rejects non-HTTPS and malformed addresses', () => {
  assert.equal(secureImageUrl('data:image/svg+xml,<svg/>'), undefined);
  assert.equal(secureImageUrl('javascript:alert(1)'), undefined);
  assert.equal(secureImageUrl('not a URL'), undefined);
});
