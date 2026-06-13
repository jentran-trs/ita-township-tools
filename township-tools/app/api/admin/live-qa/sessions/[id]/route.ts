import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { id: string } };

// PATCH — rename a session and/or open/close it. Body: { title?, status? }
export async function PATCH(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch: Record<string, any> = {};
  if (typeof body?.title === 'string') {
    const title = body.title.trim().slice(0, 200);
    if (!title) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    patch.title = title;
  }
  if (typeof body?.status === 'string') {
    if (!['open', 'closed'].includes(body.status)) {
      return NextResponse.json({ error: 'status must be open or closed' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if ('board_passcode' in (body || {})) {
    const pc = typeof body.board_passcode === 'string' ? body.board_passcode.trim() : '';
    patch.board_passcode = pc || null; // blank clears the passcode
  }
  if ('submit_opens_at' in (body || {})) {
    patch.submit_opens_at = body.submit_opens_at || null;
  }
  if ('submit_closes_at' in (body || {})) {
    patch.submit_closes_at = body.submit_closes_at || null;
  }
  if ('current_question_id' in (body || {})) {
    patch.current_question_id =
      typeof body.current_question_id === 'string' ? body.current_question_id : null;
  }
  // The submission window must be ordered: opens strictly before closes.
  if (patch.submit_opens_at && patch.submit_closes_at) {
    if (new Date(patch.submit_opens_at).getTime() >= new Date(patch.submit_closes_at).getTime()) {
      return NextResponse.json(
        { error: 'The opening time must be before the closing time.' },
        { status: 400 }
      );
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('lqa_sessions')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, session: data });
}

// DELETE — remove a session and all its questions (ON DELETE CASCADE).
export async function DELETE(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('lqa_sessions').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
