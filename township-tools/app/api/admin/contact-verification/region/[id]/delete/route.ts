import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../../lib/supabase';
import { isAdmin } from '../../../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST — delete a region and EVERYTHING under it (counties, townships, contacts,
// audit log). Requires superadmin password cookie + Clerk admin role + a
// confirmation that exactly matches the region name.
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = requireSuperadmin();
  if (sErr) return sErr;

  const body = await req.json().catch(() => ({}));
  const confirmName = (body?.confirmName || '').toString().trim();

  const supabase = createServerSupabaseClient();
  const { data: region, error: rErr } = await supabase
    .from('cv_regions')
    .select('id, name')
    .eq('id', params.id)
    .maybeSingle();
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!region) return NextResponse.json({ error: 'Region not found' }, { status: 404 });

  if (confirmName !== region.name) {
    return NextResponse.json(
      { error: `Confirmation must match the region name exactly: ${region.name}` },
      { status: 400 }
    );
  }

  // Cascades to counties, townships, contacts, audit_log via ON DELETE CASCADE
  const { error: dErr } = await supabase.from('cv_regions').delete().eq('id', params.id);
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: region.name });
}
