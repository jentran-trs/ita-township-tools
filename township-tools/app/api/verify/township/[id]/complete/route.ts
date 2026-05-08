import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const body = await req.json().catch(() => ({}));
  const reviewerName = body?.reviewer?.reviewerName || null;
  const reviewerEmail = body?.reviewer?.reviewerEmail || null;
  const sessionId = body?.reviewer?.sessionId || null;

  const { data: before } = await supabase
    .from('cv_townships')
    .select('status')
    .eq('id', params.id)
    .maybeSingle();

  const { error } = await supabase
    .from('cv_townships')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by_name: reviewerName,
      completed_by_email: reviewerEmail,
    })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('cv_audit_log').insert({
    township_id: params.id,
    action: 'mark_completed',
    before: before || null,
    after: { status: 'completed' },
    session_id: sessionId,
    reviewer_name: reviewerName,
    reviewer_email: reviewerEmail,
  });

  return NextResponse.json({ ok: true });
}
