import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { generateUniqueCode } from '@/lib/live-qa/codes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — list all sessions with per-lane counts (admin session list).
export async function GET() {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('lqa_session_summary')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data || [] });
}

// POST — create a session. Body: { title }
export async function POST(req: Request) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 200) : '';
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const codeExists = async (column: 'submit_code' | 'board_code', candidate: string) => {
    const { data } = await supabase
      .from('lqa_sessions')
      .select('id')
      .eq(column, candidate)
      .maybeSingle();
    return !!data;
  };
  const submit_code = await generateUniqueCode((c) => codeExists('submit_code', c));
  const board_code = await generateUniqueCode((c) => codeExists('board_code', c));

  const { data: session, error } = await supabase
    .from('lqa_sessions')
    .insert({ title, submit_code, board_code, status: 'open' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, session });
}
