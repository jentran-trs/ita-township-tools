import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../../lib/supabase';
import { isAdmin } from '../../../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST — upsert (admin_user_id, contact_id) with seen_at = NOW.
// DELETE — remove seen mark, so this contact reappears as a recent change.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('cv_admin_seen_contacts')
    .upsert({
      admin_user_id: authData.userId,
      contact_id: params.id,
      seen_at: new Date().toISOString(),
    });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('cv_admin_seen_contacts')
    .delete()
    .eq('admin_user_id', authData.userId)
    .eq('contact_id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
