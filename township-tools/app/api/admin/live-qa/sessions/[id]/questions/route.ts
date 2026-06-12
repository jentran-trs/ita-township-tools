import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { id: string } };

// GET — the 3-second admin poll. Returns every question for the session,
// bucketed into the three lanes the console renders.
export async function GET(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('lqa_questions')
    .select('id, question, name, township, county, status, created_at, approved_at, dismissed_at')
    .eq('session_id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const byTime = (a: string | null, b: string | null) =>
    new Date(b || 0).getTime() - new Date(a || 0).getTime();

  // Incoming: newest submission first. Approved: most-recently approved first.
  // Dismissed: most-recently dismissed first.
  const pending = rows
    .filter((r) => r.status === 'pending')
    .sort((a, b) => byTime(a.created_at, b.created_at));
  const approved = rows
    .filter((r) => r.status === 'approved')
    .sort((a, b) => byTime(a.approved_at, b.approved_at));
  const dismissed = rows
    .filter((r) => r.status === 'dismissed')
    .sort((a, b) => byTime(a.dismissed_at, b.dismissed_at));

  return NextResponse.json({ pending, approved, dismissed });
}
