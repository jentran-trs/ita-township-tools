import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth/isAdmin';
import { requireSuperadmin } from '@/lib/auth/superadmin';

export const runtime = 'nodejs';

// Change history for a single contact: every cv_audit_log row tied to it, newest
// first, with the full before/after snapshots so the UI can render field diffs.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
