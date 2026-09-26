import assert from 'node:assert/strict';
import test from 'node:test';
import { createCodeChallenge, OAuthStateStore } from './oauth-security';
import { TokenVault } from './token-vault';

test('OAuth state is single-use, platform-bound, and expires', () => {
  const store = new OAuthStateStore();
  const issued = store.issue('kick', undefined, 1_000);
  assert.equal(store.consume(issued.state, 'kick', 1_001).codeVerifier, issued.codeVerifier);
  assert.throws(() => store.consume(issued.state, 'kick', 1_002), /Invalid or expired/);

  const expired = store.issue('twitch', undefined, 1_000);
  assert.throws(() => store.consume(expired.state, 'kick', 1_001), /Invalid or expired/);
});

test('PKCE challenge is deterministic for a verifier', () => {
  assert.equal(
    createCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  );
});

test('token vault encrypts and authenticates persisted token values', () => {
  const vault = new TokenVault('a'.repeat(32));
  const encrypted = vault.encrypt('refresh-token-value');
  assert.notEqual(encrypted, 'refresh-token-value');
  assert.equal(vault.decrypt(encrypted), 'refresh-token-value');
  assert.throws(() => vault.decrypt(`${encrypted}x`));
});
