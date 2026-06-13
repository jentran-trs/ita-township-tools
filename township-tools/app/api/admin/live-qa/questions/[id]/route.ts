import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { id: string } };

// PATCH — move a question between lanes. Body: { action: 'approve'|'dismiss'|'restore' }
//   approve  pending  → approved   (stamp approved_at; appears on public board)
//   dismiss  any      → dismissed  (stamp dismissed_at; leaves public board)
//   restore  dismissed→ pending    (clear both timestamps; back to Incoming)
export async function PATCH(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const now = new Date().toISOString();
  let patch: Record<string, any>;
  switch (body?.action) {
    case 'approve':
      patch = { status: 'approved', approved_at: now, dismissed_at: null };
      break;
    case 'dismiss':
      patch = { status: 'dismissed', dismissed_at: now };
      break;
    case 'restore':
      // Back onto the board (no approval step).
      patch = { status: 'approved', approved_at: now, dismissed_at: null };
      break;
    default:
      return NextResponse.json(
        { error: 'action must be approve, dismiss, or restore' },
        { status: 400 }
      );
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('lqa_questions')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Leaving the board (dismiss) or coming back (restore) should never keep this
  // question as the "now answering" one — clear the pointer if it matches so a
  // restore returns it as a regular question. Best-effort; ignored pre-v23.
  if (body.action === 'dismiss' || body.action === 'restore') {
    await supabase.from('lqa_sessions').update({ current_question_id: null }).eq('current_question_id', params.id);
  }

  return NextResponse.json({ ok: true, question: data });
}

// DELETE — hard-delete a single question (spam cleanup).
export async function DELETE(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('lqa_questions').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
