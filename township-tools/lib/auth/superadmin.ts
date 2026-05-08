import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const PASSWORD = process.env.CV_SUPERADMIN_PASSWORD || 'TownshipVerify@2026';
export const COOKIE_NAME = 'cv_superadmin';
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function passwordHash(): string {
  return crypto.createHash('sha256').update(PASSWORD).digest('hex');
}

export function tokenForPassword(input: string): string | null {
  if (input === PASSWORD) return passwordHash();
  return null;
}

export function isSuperadminFromCookies(): boolean {
  const tok = cookies().get(COOKIE_NAME)?.value;
  if (!tok) return false;
  const expected = passwordHash();
  if (tok.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(tok, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

export function requireSuperadmin(): NextResponse | null {
  if (!isSuperadminFromCookies()) {
    return NextResponse.json({ error: 'Superadmin password required' }, { status: 403 });
  }
  return null;
}
