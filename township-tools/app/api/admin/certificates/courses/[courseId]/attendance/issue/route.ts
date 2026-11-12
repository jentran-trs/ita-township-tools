import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { loadCourseAttendance, AttendanceRow } from '@/lib/badges/admin-attendance';
import { buildCredentialId, generateUniqueCredentialId } from '@/lib/certificates/credential-id';
import { recipientKey } from '@/lib/certificates/xlsx-import';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Eligibility = { eligible: boolean; reason?: string };

// Who gets a certificate from badge attendance:
//  - Attended (in and out every day) → full course hours.
//  - Partial credit entered by Jen with more than 0 hours → those hours.
//  - Everyone else waits for review. Nobody without an email (walk-ins who
//    didn't give one) can look their certificate up, so they're held too.
function eligibility(r: AttendanceRow): Eligibility {
  if (r.certificate_id) return { eligible: false, reason: 'Already issued' };
  if (!r.email) return { eligible: false, reason: 'No email address' };
  if (r.day_hours) {
    return r.credit_hours > 0 ? { eligible: true } : { eligible: false, reason: 'Partial credit is 0 hours' };
  }
  if (r.status === 'attended') return { eligible: true };
  return { eligible: false, reason: r.status === 'review' ? 'Needs review' : 'No scans' };
}

// GET — preview: who would get a certificate and who is held back, and why.
export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const data = await loadCourseAttendance(params.courseId);
  if (!data) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  const rows = data.rows.map((r) => ({
    id: r.id,
    name: `${r.first_name} ${r.last_name}`,
    credit_hours: r.credit_hours,
    partial: !!r.day_hours,
    issued: !!r.certificate_id,
    ...eligibility(r),
  }));
  return NextResponse.json({ course_hours: Number(data.course.hours), rows });
}

// POST — issue certificates to everyone eligible. Safe to run again after
// fixing reviews: people who already have one are skipped. If someone already
// has an active certificate for this course from the spreadsheet import, it
// is linked (and given their partial hours) instead of duplicated.
export async function POST(_req: Request, { params }: { params: { courseId: string } }) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const data = await loadCourseAttendance(params.courseId);
  if (!data) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  const { course } = data;
  const supabase = createServerSupabaseClient();

  // Keep already-issued certificates in step with partial credit edited later.
  for (const r of data.rows.filter((x) => x.certificate_id)) {
    await supabase
      .from('certificates')
      .update({ hours_override: r.day_hours ? r.credit_hours : null })
      .eq('id', r.certificate_id!);
  }

  const targets = data.rows.filter((r) => eligibility(r).eligible);
  if (!targets.length) return NextResponse.json({ ok: true, issued: 0, linked: 0, failed: [] });

  const { data: existing } = await supabase
    .from('certificates')
    .select('id, attendee_email, attendee_first, attendee_last')
    .eq('course_id', course.id)
    .eq('status', 'active');
  const existingByKey = new Map(
    (existing || []).map((c: any) => [recipientKey(c.attendee_email, c.attendee_first, c.attendee_last), c.id])
  );

  let issued = 0;
  let linked = 0;
  const failed: { name: string; reason: string }[] = [];

  for (const r of targets) {
    const hoursOverride = r.day_hours ? r.credit_hours : null;
    const existingId = existingByKey.get(recipientKey(r.email, r.first_name, r.last_name));
    let certId = existingId as string | undefined;

    if (certId) {
      const { error } = await supabase.from('certificates').update({ hours_override: hoursOverride }).eq('id', certId);
      if (error) {
        failed.push({ name: `${r.first_name} ${r.last_name}`, reason: error.message });
        continue;
      }
      linked += 1;
    } else {
      let credentialId: string;
      try {
        credentialId = await generateUniqueCredentialId(course.course_id, async (candidate) => {
          const { data: hit } = await supabase.from('certificates').select('id').eq('credential_id', candidate).maybeSingle();
          return !!hit;
        });
      } catch {
        credentialId = buildCredentialId(course.course_id);
      }
      const { data: row, error } = await supabase
        .from('certificates')
        .insert({
          credential_id: credentialId,
          course_id: course.id,
          attendee_first: r.first_name,
          attendee_last: r.last_name,
          attendee_email: r.email,
          attendee_township: r.township,
          attendee_county: r.county,
          status: 'active',
          hours_override: hoursOverride,
        })
        .select('id')
        .single();
      if (error || !row) {
        failed.push({ name: `${r.first_name} ${r.last_name}`, reason: error?.message || 'Insert failed' });
        continue;
      }
      certId = row.id;
      issued += 1;
    }
    await supabase.from('cert_registrants').update({ certificate_id: certId }).eq('id', r.id);
  }

  return NextResponse.json({ ok: true, issued, linked, failed });
}
