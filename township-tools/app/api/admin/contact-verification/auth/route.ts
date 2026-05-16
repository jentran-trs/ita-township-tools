import { NextResponse } from 'next/server';
import {
  tokenForPassword,
  isSuperadmin,
  COOKIE_NAME,
  COOKIE_MAX_AGE_SECONDS,
} from '../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — am I currently authorized? Returns true if EITHER the password
// cookie is set OR the Clerk user has privateMetadata.role === "superadmin".
export async function GET() {
  return NextResponse.json({ ok: await isSuperadmin() });
}

// POST — submit password; sets cookie if it matches
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = (body?.password || '').toString();
  const token = tokenForPassword(password);
  if (!token) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}

// DELETE — log out of superadmin
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return res;
}
