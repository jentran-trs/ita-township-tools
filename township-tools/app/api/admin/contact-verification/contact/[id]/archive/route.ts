import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth/isAdmin';
import { requireSuperadmin } from '@/lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST — archive (soft-delete) a single contact. Sets deleted_at and writes a
// 'delete' audit-log row with the full before-snapshot, so it stays in the
// contact's change history and can be restored by clearing deleted_at.
// Superadmin-only; also requires a Clerk org admin (this is an admin-page action).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const contactId = params.id;
  const supabase = createServerSupabaseClient();

  const { data: existing, error: exErr } = await supabase
    .from('cv_contacts')
    .select('*')
    .eq('id', contactId)
    .is('deleted_at', null)
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Contact not found or already archived' }, { status: 404 });

  const { error } = await supabase
    .from('cv_contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', contactId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('cv_audit_log').insert({
    township_id: (existing as any).township_id,
    contact_id: contactId,
    action: 'delete',
    before: existing,
    after: null,
    reviewer_name: 'ITA Admin',
  });

  return NextResponse.json({ ok: true });
}
