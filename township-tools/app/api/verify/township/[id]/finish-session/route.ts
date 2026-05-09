import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';
import { isPortalLocked } from '../../../../../../lib/contact-verification/portal-lock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Log a partial-finish session event. Does NOT change cv_townships.status —
// the township stays "in_progress" since not everything was reviewed.
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const { data: cfg } = await supabase
    .from('cv_settings')
    .select('verification_deadline')
    .eq('id', 1)
    .maybeSingle();
  if (isPortalLocked(cfg?.verification_deadline || null)) {
    return NextResponse.json(
      { error: 'The portal is currently closed for finalization.' },
      { status: 423 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const reviewerName = body?.reviewer?.reviewerName || null;
  const reviewerEmail = body?.reviewer?.reviewerEmail || null;
  const sessionId = body?.reviewer?.sessionId || null;
  const note = (body?.note || '').toString().trim() || null;

  const { error } = await supabase.from('cv_audit_log').insert({
    township_id: params.id,
    action: 'session_finished',
    before: null,
    after: { note, reviewer_name: reviewerName, reviewer_email: reviewerEmail },
    session_id: sessionId,
    reviewer_name: reviewerName,
    reviewer_email: reviewerEmail,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
