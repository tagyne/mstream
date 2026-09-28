export type LinkedPlatformAccount = {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  scope?: string | null;
};

type AccountChangeHandler = (account: LinkedPlatformAccount, deleted: boolean) => Promise<void>;

let handler: AccountChangeHandler | undefined;

export function registerPlatformAccountChangeHandler(next: AccountChangeHandler | undefined): void {
  handler = next;
}

export async function onPlatformAccountChanged(
  account: LinkedPlatformAccount,
  deleted = false,
): Promise<void> {
  if (account.providerId === 'twitch' || account.providerId === 'kick') {
    await handler?.(account, deleted);
  }
}
