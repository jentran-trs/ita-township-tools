import crypto from 'crypto';

// Per-event scanner PIN. Stored only as a salted SHA-256 hash on
// cert_courses.scanner_pin_hash; the course id is the salt so the same PIN
// on two events produces different hashes.
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 12;

export function isValidPin(pin: string): boolean {
  return new RegExp(`^[0-9A-Za-z]{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin);
}

export function hashPin(courseId: string, pin: string): string {
  return crypto.createHash('sha256').update(`${courseId}:${pin}`).digest('hex');
}

export function pinMatches(courseId: string, pin: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashPin(courseId, pin), 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
