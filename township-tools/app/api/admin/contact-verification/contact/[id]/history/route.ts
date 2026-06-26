import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';

export const runtime = 'nodejs';

// Change history for a single contact: every cv_audit_log row tied to it, newest
// first, with the full before/after snapshots so the UI can render field diffs.
// Superadmin-only — gated on requireSuperadmin() alone (cookie OR Clerk metadata)
// so it also works for the cookie-authenticated superadmin on the public portal.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const contactId = params.id;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('cv_audit_log')
    .select('id, action, before, after, reviewer_name, reviewer_email, created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ history: data || [] });
}
