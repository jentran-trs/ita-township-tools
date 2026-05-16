import crypto from 'crypto';
import { cookies } from 'next/headers';
import { auth, clerkClient } from '@clerk/nextjs/server';
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

// Path 1: password cookie. Set after the user enters the shared password on
// /admin/contact-verification. Sync — reads cookies() directly.
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

// Path 2: Clerk user-level role. Grants superadmin to any Clerk user whose
// privateMetadata is `{ "role": "superadmin" }`. Set this in the Clerk
// dashboard under Users → pick a user → Edit → Private metadata.
// Private (not public) metadata is used so the role isn't exposed to the
// client — it's only readable server-side via clerkClient.
export async function isSuperadminViaClerk(): Promise<boolean> {
  try {
    const authData = await auth();
    if (!authData?.userId) return false;
    const client = await clerkClient();
    const user = await client.users.getUser(authData.userId);
    return user.privateMetadata?.role === 'superadmin';
  } catch {
    return false;
  }
}

// Combined: superadmin if EITHER path grants it. Used by the auth GET endpoint
// to tell the frontend whether to reveal superadmin UI, and by route guards.
export async function isSuperadmin(): Promise<boolean> {
  if (isSuperadminFromCookies()) return true;
  return await isSuperadminViaClerk();
}

// Server-side route guard. Use as:
//   const sErr = await requireSuperadmin();
//   if (sErr) return sErr;
export async function requireSuperadmin(): Promise<NextResponse | null> {
  if (await isSuperadmin()) return null;
  return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
}
