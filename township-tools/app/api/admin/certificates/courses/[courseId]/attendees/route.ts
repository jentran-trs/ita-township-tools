import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { recipientKey } from '@/lib/certificates/xlsx-import';
import { buildCredentialId, generateUniqueCredentialId } from '@/lib/certificates/credential-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { courseId: string } };

// Mirrors the validation used by the bulk xlsx import.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

// "Hancock County" → "Hancock", matching the import's county normalization.
function stripCountySuffix(v: string): string {
  return v.replace(/\s+county\s*$/i, '').trim();
}

// POST — manually add a single participant (certificate) to a course. Used when
// someone was missing from the imported roster. Issues an active certificate
// with a fresh credential ID, exactly like the bulk import does per row.
export async function POST(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const first = clean(body.first);
  const last = clean(body.last);
  const email = clean(body.email).toLowerCase();
  const township = clean(body.township) || null;
  const county = stripCountySuffix(clean(body.county)) || null;

  if (!first) return NextResponse.json({ error: 'First name is required' }, { status: 400 });
  if (!last) return NextResponse.json({ error: 'Last name is required' }, { status: 400 });
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: course, error: courseErr } = await supabase
    .from('cert_courses')
    .select('id, course_id')
    .eq('id', params.courseId)
    .maybeSingle();
  if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 500 });
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

  // Block an exact-identity duplicate (same email + first + last) that already
  // holds a live certificate for this course. Reissued rows are historical and
  // don't count. To refresh an existing one, use Re-issue on the attendee row.
  const { data: existing, error: exErr } = await supabase
    .from('certificates')
    .select('attendee_email, attendee_first, attendee_last')
    .eq('course_id', course.id)
    .eq('attendee_email', email)
    .neq('status', 'reissued');
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  const wantKey = recipientKey(email, first, last);
  const dupe = (existing || []).some(
    (r: any) => recipientKey(r.attendee_email, r.attendee_first, r.attendee_last) === wantKey
  );
  if (dupe) {
    return NextResponse.json(
      { error: 'This person already has a certificate for this course.' },
      { status: 409 }
    );
  }

  // Generate a unique credential id (retry on rare collision).
  let credentialId: string;
  try {
    credentialId = await generateUniqueCredentialId(course.course_id, async (candidate) => {
      const { data } = await supabase
        .from('certificates')
        .select('id')
        .eq('credential_id', candidate)
        .maybeSingle();
      return !!data;
    });
  } catch {
    credentialId = buildCredentialId(course.course_id);
  }

  const { data: newRow, error: insErr } = await supabase
    .from('certificates')
    .insert({
      credential_id: credentialId,
      course_id: course.id,
      attendee_first: first,
      attendee_last: last,
      attendee_email: email,
      attendee_township: township,
      attendee_county: county,
      status: 'active',
    })
    .select()
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, certificate: newRow });
}
