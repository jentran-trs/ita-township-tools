import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../../lib/supabase';
import { requireSuperadmin } from '../../../../../../../lib/auth/superadmin';
import { generateUniqueCredentialId } from '../../../../../../../lib/certificates/credential-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { id: string } };

// POST — reissue a certificate with a fresh credential ID.
//
// Two flows depending on the current status:
//   active  → mark the existing row as `reissued` and insert a NEW active
//             row (preserves a history trail of the previous credential).
//   revoked → revive the SAME row in place (new credential ID, status back
//             to active, revoke metadata cleared). Avoids leaving a
//             confusing "reissued + active" pair in the attendee list for
//             what was essentially an undo-and-replace.
//   reissued → 409, already done.
export async function POST(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();

  const { data: cert, error: getErr } = await supabase
    .from('certificates')
    .select('*, cert_courses!inner(course_id)')
    .eq('id', params.id)
    .maybeSingle();
  if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 });
  if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
  if (cert.status === 'reissued') {
    return NextResponse.json({ error: 'This certificate has already been reissued.' }, { status: 409 });
  }

  const courseHumanId = (cert.cert_courses as any).course_id;

  const newCredentialId = await generateUniqueCredentialId(courseHumanId, async (candidate) => {
    const { data } = await supabase
      .from('certificates')
      .select('id')
      .eq('credential_id', candidate)
      .maybeSingle();
    return !!data;
  });

  // Revoked → reissue: revive in place so the attendee list stays clean.
  if (cert.status === 'revoked') {
    const { data: revived, error: updErr } = await supabase
      .from('certificates')
      .update({
        credential_id: newCredentialId,
        status: 'active',
        revoke_reason: null,
        revoked_at: null,
        issued_at: new Date().toISOString(),
        last_downloaded_at: null,
      })
      .eq('id', cert.id)
      .select()
      .single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, certificate: revived, mode: 'revived' });
  }

  // Active → reissue: insert the new active row first; if it succeeds, mark
  // the old one reissued.
  const { data: newCert, error: insErr } = await supabase
    .from('certificates')
    .insert({
      credential_id: newCredentialId,
      course_id: cert.course_id,
      attendee_first: cert.attendee_first,
      attendee_last: cert.attendee_last,
      attendee_email: cert.attendee_email,
      attendee_township: cert.attendee_township,
      attendee_county: cert.attendee_county,
      status: 'active',
    })
    .select()
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  const { error: updErr } = await supabase
    .from('certificates')
    .update({ status: 'reissued' })
    .eq('id', cert.id);
  if (updErr) {
    // Rollback the new row to keep state consistent
    await supabase.from('certificates').delete().eq('id', newCert.id);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, certificate: newCert, mode: 'replaced' });
}
