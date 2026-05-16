import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../../lib/supabase';
import { isAdmin } from '../../../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin(); if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('cv_townships')
    .update({ status: 'in_progress', completed_at: null, completed_by_name: null, completed_by_email: null })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('cv_audit_log').insert({
    township_id: params.id,
    action: 'admin_reopen',
    after: { status: 'in_progress' },
  });

  return NextResponse.json({ ok: true });
}
