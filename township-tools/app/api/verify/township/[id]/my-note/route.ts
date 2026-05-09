import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET ?email=... — return this reviewer's most recent handoff note for this township,
// so they can see what they wrote last time and update it.
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(req.url);
  const email = (url.searchParams.get('email') || '').toLowerCase().trim();
  if (!email) return NextResponse.json({ note: null });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cv_audit_log')
    .select('id, created_at, after, reviewer_email')
    .eq('township_id', params.id)
    .eq('action', 'session_finished')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mine = (data || []).find(
    (r: any) => (r.reviewer_email || '').toLowerCase().trim() === email
  );
  if (!mine) return NextResponse.json({ note: null });

  return NextResponse.json({
    note: mine.after?.note || null,
    created_at: mine.created_at,
  });
}
