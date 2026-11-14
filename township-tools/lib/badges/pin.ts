import crypto from 'crypto';

// Per-event scanner PIN. Stored only as a salted SHA-256 hash on
// cert_courses.scanner_pin_hash; the course id is the salt so the same PIN
// on two events produces different hashes.
// Digits only: the scanner shows a number keypad, which is fastest for door
// volunteers and avoids upper/lower-case mistakes on phones.
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;

export function isValidPin(pin: string): boolean {
  return new RegExp(`^[0-9]{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin);
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

// The PIN is also kept encrypted (v40, cert_courses.scanner_pin_enc) so the
// superadmin can see it on the course page. Unlocking still uses the hash.
function pinKey(): Buffer {
  const secret = process.env.SCANNER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return crypto.createHash('sha256').update(`scanner-pin:${secret}`).digest();
}

export function encryptPin(courseId: string, pin: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', pinKey(), iv);
  c.setAAD(Buffer.from(courseId));
  const enc = Buffer.concat([c.update(pin, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
}

/** The PIN, or null if it was set before v40 or can't be read. */
export function decryptPin(courseId: string, stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    const [iv, tag, enc] = stored.split('.').map((x) => Buffer.from(x, 'base64url'));
    const d = crypto.createDecipheriv('aes-256-gcm', pinKey(), iv);
    d.setAAD(Buffer.from(courseId));
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}
