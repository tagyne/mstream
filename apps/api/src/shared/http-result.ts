import type { OutboundMessageResult, Platform } from '@mstream/contracts';

export function mapHttpFailure(
  platform: Platform,
  status: number,
  message?: string,
): OutboundMessageResult {
  const mapped = status === 401 ? 'token-expired' : status === 429 ? 'rate-limited' : 'rejected';
  return { platform, status: mapped, message };
}
