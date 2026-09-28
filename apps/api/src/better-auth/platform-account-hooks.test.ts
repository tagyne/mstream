import assert from 'node:assert/strict';
import test from 'node:test';
import {
  onPlatformAccountChanged,
  registerPlatformAccountChangeHandler,
} from './platform-account-hooks';

test('Better Auth account hooks forward only Twitch and Kick changes', async () => {
  const changed: string[] = [];
  registerPlatformAccountChangeHandler(async (account, deleted) => {
    changed.push(`${account.providerId}:${deleted}`);
  });
  try {
    const account = { id: 'a', accountId: '42', userId: 'u', providerId: 'twitch' };
    await onPlatformAccountChanged(account);
    await onPlatformAccountChanged({ ...account, providerId: 'kick' }, true);
    await onPlatformAccountChanged({ ...account, providerId: 'other' });
    assert.deepEqual(changed, ['twitch:false', 'kick:true']);
  } finally {
    registerPlatformAccountChangeHandler(undefined);
  }
});
