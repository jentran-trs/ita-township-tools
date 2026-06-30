import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';
import { isPortalLocked } from '../../../../../../lib/contact-verification/portal-lock';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const { data: cfg } = await supabase
    .from('cv_settings')
    .select('verification_deadline, portal_status_override')
    .eq('id', 1)
    .maybeSingle();
  if (isPortalLocked(cfg?.verification_deadline || null, cfg?.portal_status_override || 'auto')) {
    return NextResponse.json(
      { error: 'The portal is currently closed for finalization.' },
      { status: 423 }
    );
  }
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
