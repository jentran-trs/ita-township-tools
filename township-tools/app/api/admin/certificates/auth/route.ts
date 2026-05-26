import { NextResponse } from 'next/server';
import { isSuperadmin } from '../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — am I superadmin? (Frontend uses this to decide whether to render the
// admin UI.) Logging in is done via /api/admin/contact-verification/auth.
export async function GET() {
  return NextResponse.json({ ok: await isSuperadmin() });
}
