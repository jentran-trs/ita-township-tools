import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { isSuperadmin } from '@/lib/auth/superadmin';

// Editing the merger map is unlocked with a shared passcode. The map is meant
// to be embedded in an iframe on the ITA website, where third-party cookies
// are often blocked, so the browser keeps the passcode in sessionStorage and
// sends it on every write in this header instead of relying on a cookie.
export const PASSCODE_HEADER = 'x-merger-map-passcode';

function configuredPasscode(): string | null {
  const p = process.env.MERGER_MAP_PASSCODE;
  return p && p.trim() ? p.trim() : null;
}

export function passcodeMatches(input: string | null | undefined): boolean {
  const expected = configuredPasscode();
  if (!expected || !input) return false;
  const a = crypto.createHash('sha256').update(input.trim()).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// Route guard for write endpoints. Passes for the correct passcode header or
// an ITA superadmin (cookie or Clerk role).
export async function requireMapEditor(req: Request): Promise<NextResponse | null> {
  if (passcodeMatches(req.headers.get(PASSCODE_HEADER))) return null;
  if (await isSuperadmin()) return null;
  return NextResponse.json({ error: 'Incorrect passcode' }, { status: 403 });
}
