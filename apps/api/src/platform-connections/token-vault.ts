import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';

export class TokenVault {
  private readonly key: Buffer;

  constructor(secret: string) {
    if (secret.length < 32) {
      throw new Error('Token vault secret must contain at least 32 characters');
    }
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
  }

  decrypt(payload: string): string {
    const [version, ivValue, tagValue, ciphertextValue] = payload.split('.');
    if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue) {
      throw new Error('Invalid encrypted token payload');
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}


export function configuredTokenVault(): TokenVault {
  const secret = process.env.TOKEN_ENCRYPTION_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('TOKEN_ENCRYPTION_SECRET or BETTER_AUTH_SECRET is required');
  return new TokenVault(secret);
}
