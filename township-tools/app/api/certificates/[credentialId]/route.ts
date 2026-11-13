import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { credentialId: string } };

// GET — public verify endpoint. Returns just enough to confirm a credential:
// recipient first + last, course, date, hours, method, status. No PDF, no
// email. Returns 200 with status fields populated for any known credential ID
// (active / revoked / reissued); 404 for unknown.
export async function GET(_req: Request, { params }: RouteParams) {
  const credentialId = (params.credentialId || '').trim();
  if (!credentialId) {
    return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: cert, error } = await supabase
    .from('certificates')
    // '*' so partial-credit hours_override is read when present.
    .select('*')
    .eq('credential_id', credentialId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!cert) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });

  const { data: course, error: courseErr } = await supabase
    .from('cert_courses')
    // '*' so this keeps working whether or not the v35 `hidden` column exists.
    .select('*')
    .eq('id', cert.course_id)
    .maybeSingle();
  if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 500 });
  // A course hidden from the public verifies as not found.
  if (!course || course.hidden) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });

  return NextResponse.json({
    credential_id: cert.credential_id,
    recipient: {
      first: cert.attendee_first,
      last: cert.attendee_last,
      township: cert.attendee_township,
      county: cert.attendee_county,
    },
    course: {
      course_id: course.course_id,
      name: course.name,
      hours: cert.hours_override != null ? Number(cert.hours_override) : Number(course.hours),
      method: course.method,
      course_date: course.course_date,
      course_end_date: course.course_end_date,
      cert_type: course.cert_type,
      org_name: course.org_name,
      syllabus: course.syllabus,
      syllabus_file_url: course.syllabus_file_url,
      syllabus_file_name: course.syllabus_file_name,
    },
    status: cert.status,
    issued_at: cert.issued_at,
  });
}
