import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST — public. Verify a screencast board passcode so the presenter can unlock
// dismiss controls. Body: { board_code, passcode }. Returns { ok: boolean }.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const boardCode = typeof body?.board_code === 'string' ? body.board_code.trim() : '';
  const passcode = typeof body?.passcode === 'string' ? body.passcode : '';
  if (!boardCode || !passcode) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from('lqa_sessions')
    .select('board_passcode')
    .eq('board_code', boardCode)
    .maybeSingle();

  const ok = !!session?.board_passcode && passcode === session.board_passcode;
  return NextResponse.json({ ok });
}
