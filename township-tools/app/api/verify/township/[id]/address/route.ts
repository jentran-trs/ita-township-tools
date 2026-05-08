import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const body = await req.json().catch(() => ({}));
  const { reviewer, confirm, markUnreviewed, street_address, mailing_address } = body || {};
  const reviewerName = reviewer?.reviewerName || null;
  const reviewerEmail = reviewer?.reviewerEmail || null;
  const sessionId = reviewer?.sessionId || null;

  const { data: existing, error: exErr } = await supabase
    .from('cv_townships')
    .select('id, status, street_address, mailing_address, address_status')
    .eq('id', params.id)
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const update: Record<string, any> = {};
  if (markUnreviewed) {
    update.address_status = 'unreviewed';
    update.address_reviewed_at = null;
    update.address_reviewed_by_name = null;
    update.address_reviewed_by_email = null;
  } else if (confirm) {
    update.address_status = 'confirmed';
    update.address_reviewed_at = new Date().toISOString();
    update.address_reviewed_by_name = reviewerName;
    update.address_reviewed_by_email = reviewerEmail;
  } else {
    if (typeof street_address === 'string') update.street_address = street_address || null;
    if (typeof mailing_address === 'string') update.mailing_address = mailing_address || null;
    update.address_status = 'updated';
    update.address_reviewed_at = new Date().toISOString();
    update.address_reviewed_by_name = reviewerName;
    update.address_reviewed_by_email = reviewerEmail;
  }

  if (existing.status !== 'in_progress') update.status = 'in_progress';

  const { data, error } = await supabase
    .from('cv_townships')
    .update(update)
    .eq('id', params.id)
    .select('id, street_address, mailing_address, address_status, address_reviewed_at, address_reviewed_by_name, status')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('cv_audit_log').insert({
    township_id: params.id,
    action: markUnreviewed ? 'address_undo' : confirm ? 'address_confirm' : 'address_update',
    before: { street_address: existing.street_address, mailing_address: existing.mailing_address, address_status: existing.address_status },
    after: { street_address: data.street_address, mailing_address: data.mailing_address, address_status: data.address_status },
    session_id: sessionId,
    reviewer_name: reviewerName,
    reviewer_email: reviewerEmail,
  });

  return NextResponse.json({ township: data });
}
