import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST — public, passcode-authorized. The screencast presenter sets (or clears)
// the question currently being answered. Body: { board_code, passcode, question_id|null }.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const boardCode = typeof body?.board_code === 'string' ? body.board_code.trim() : '';
  const passcode = typeof body?.passcode === 'string' ? body.passcode : '';
  const questionId = typeof body?.question_id === 'string' ? body.question_id : null;
  if (!boardCode) return NextResponse.json({ error: 'Missing board_code' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from('lqa_sessions')
    .select('id, board_passcode')
    .eq('board_code', boardCode)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  if (!session.board_passcode || passcode !== session.board_passcode) {
    return NextResponse.json({ error: 'Incorrect passcode' }, { status: 403 });
  }

  const { error } = await supabase
    .from('lqa_sessions')
    .update({ current_question_id: questionId })
    .eq('id', session.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
