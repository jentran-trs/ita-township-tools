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
