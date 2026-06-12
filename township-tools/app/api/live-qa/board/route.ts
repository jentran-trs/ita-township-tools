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

  const { data: session, error: sErr } = await supabase
    .from('lqa_sessions')
    .select('id, title, status')
    .eq('board_code', code)
    .maybeSingle();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

  const { data: questions, error: qErr } = await supabase
    .from('lqa_questions')
    .select('id, question, name, township, county, approved_at')
    .eq('session_id', session.id)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false });
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  return NextResponse.json({
    session: { title: session.title, status: session.status },
    questions: questions || [],
  });
}
