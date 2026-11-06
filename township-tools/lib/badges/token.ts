import { randomBytes } from 'crypto';

// Badge QR payload. Deliberately NOT a URL and contains no personal data:
// scanning a badge with a normal phone camera just shows this opaque string.
// Only the Township Tools scanner (unlocked with the event PIN) can act on it.
//
// Format: "ITA1-" + 20 base32 characters (100 bits of randomness).
const PREFIX = 'ITA1-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, no I/O/0/1

export function generateBadgeToken(): string {
  const bytes = randomBytes(20);
  let out = PREFIX;
  for (let i = 0; i < bytes.length; i++) out += ALPHABET[bytes[i] & 31];
  return out;
}

export function isBadgeToken(value: string): boolean {
  return /^ITA1-[A-Z2-9]{20}$/.test(value.trim());
}
