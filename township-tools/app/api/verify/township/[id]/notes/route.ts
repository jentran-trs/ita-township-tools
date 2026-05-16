import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';
import { isSuperadmin } from '../../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — superadmin-only endpoint that returns all reviewer handoff notes for a township.
// Notes are kept private from reviewers; only the superadmin (password cookie) can see them.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cv_audit_log')
    .select('id, created_at, reviewer_name, reviewer_email, after')
    .eq('township_id', params.id)
    .eq('action', 'session_finished')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Dedupe by reviewer email — show only the latest note per reviewer.
  const seen = new Set<string>();
  const notes = (data || [])
    .filter((r: any) => r.after?.note)
    .filter((r: any) => {
      const key = (r.reviewer_email || `id-${r.id}`).toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((r: any) => ({
      id: r.id,
      created_at: r.created_at,
      reviewer_name: r.reviewer_name,
      note: r.after?.note,
    }));

  return NextResponse.json({ notes });
}
