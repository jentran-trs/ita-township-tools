import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET ?code=<board_code> — public. The screencast live board polls this every
// few seconds. Returns ONLY approved questions for the session; pending and
// dismissed questions never leave this route.
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get('code')?.trim() || '';
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // select('*') so this keeps working before the v23 current_question_id column exists.
  const { data: session, error: sErr } = await supabase
    .from('lqa_sessions')
    .select('*')
    .eq('board_code', code)
    .maybeSingle();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

  const { data: questions, error: qErr } = await supabase
    .from('lqa_questions')
    .select('id, question, name, township, county, approved_at')
    .eq('session_id', session.id)
    // Everything that hasn't been dismissed is on the board (no approval step).
    .neq('status', 'dismissed')
    // By board-join time so new AND restored questions stack UNDER the existing
    // ones (restored questions get a fresh approved_at).
    .order('approved_at', { ascending: true, nullsFirst: true });
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  // Total questions ever submitted (any status) — the engagement counter.
  const { count: totalCount } = await supabase
    .from('lqa_questions')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session.id);

  return NextResponse.json({
    session: {
      title: session.title,
      status: session.status,
      passcode_set: !!session.board_passcode,
      current_question_id: session.current_question_id ?? null,
    },
    questions: questions || [],
    total_count: totalCount ?? 0,
  });
}
