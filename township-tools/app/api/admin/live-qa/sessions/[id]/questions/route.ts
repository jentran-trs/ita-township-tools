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

  // Which question is currently being answered (mirrors the screencast).
  // select('*') stays graceful before the v23 column exists.
  const { data: sessionRow } = await supabase
    .from('lqa_sessions')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  const currentQuestionId = (sessionRow as any)?.current_question_id ?? null;

  const rows = data || [];
  const byTime = (a: string | null, b: string | null) =>
    new Date(b || 0).getTime() - new Date(a || 0).getTime();

  // No approval step: anything not dismissed is live on the board. Oldest first
  // (newest at the bottom, matching the screencast board); most-recently
  // dismissed first in the dismissed lane.
  const live = rows
    .filter((r) => r.status !== 'dismissed')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const dismissed = rows
    .filter((r) => r.status === 'dismissed')
    .sort((a, b) => byTime(a.dismissed_at, b.dismissed_at));

  return NextResponse.json({ live, dismissed, current_question_id: currentQuestionId });
}

// POST — superadmin types a question straight onto the board.
// Body: { question, name?, township?, county? }
export async function POST(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const clean = (v: unknown, max: number) =>
    typeof v === 'string' ? v.trim().slice(0, max) : '';
  const question = clean(body?.question, 1000);
  const name = clean(body?.name, 120) || 'Organizer';
  const township = clean(body?.township, 120) || null;
  const county = clean(body?.county, 120) || null;
  if (!question) return NextResponse.json({ error: 'Question is required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('lqa_questions')
    .insert({
      session_id: params.id,
      question,
      name,
      township,
      county,
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, question: data });
}
