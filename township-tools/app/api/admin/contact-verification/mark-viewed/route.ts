import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { isAdmin } from '../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — return the admin's prior last_viewed_at WITHOUT updating it.
// Used by the dashboard to compute "since last visit" badges before marking viewed.
export async function GET() {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = requireSuperadmin(); if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('cv_admin_views')
    .select('last_viewed_at')
    .eq('admin_user_id', authData.userId)
    .maybeSingle();
  return NextResponse.json({ last_viewed_at: data?.last_viewed_at || null });
}

// POST — stamp last_viewed_at = now() for this admin.
export async function POST() {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = requireSuperadmin(); if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('cv_admin_views')
    .upsert({ admin_user_id: authData.userId, last_viewed_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
