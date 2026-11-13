import { NextResponse } from 'next/server';
import { passcodeMatches } from '@/lib/merger-map/auth';
import { corsPreflight, withCors } from '@/lib/merger-map/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return corsPreflight();
}

// POST — public. Body: { passcode }. Returns { ok } so the map can reveal its
// edit controls. Writes re-check the passcode on every request.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return withCors(NextResponse.json({ ok: false }, { status: 400 }));
  }
  const ok = passcodeMatches(typeof body?.passcode === 'string' ? body.passcode : '');
  if (!ok) await new Promise((r) => setTimeout(r, 600)); // slow down guessing
  return withCors(NextResponse.json({ ok }));
}
