import { randomInt } from 'crypto';

// Unambiguous alphabet: A-Z minus I, O, L; 2-9 (no 0/1). 31 characters.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SUFFIX_LENGTH = 6;
const MAX_ATTEMPTS = 12;

function randomSuffix(): string {
  let out = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

export function buildCredentialId(courseId: string): string {
  return `${courseId}-${randomSuffix()}`;
}

/**
 * Generate a credential_id that is guaranteed unique against the provided
 * checker. The checker takes a candidate id and returns true if it is
 * already in use. Retries up to MAX_ATTEMPTS before throwing.
 */
export async function generateUniqueCredentialId(
  courseId: string,
  exists: (candidate: string) => Promise<boolean>
): Promise<string> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const candidate = buildCredentialId(courseId);
    // eslint-disable-next-line no-await-in-loop
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error(`Failed to generate a unique credential id after ${MAX_ATTEMPTS} attempts`);
}

export const CREDENTIAL_ALPHABET = ALPHABET;
export const CREDENTIAL_SUFFIX_LENGTH = SUFFIX_LENGTH;
