import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isLikelyEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ certificates: [] });
  }

  const email = (typeof body?.email === 'string' ? body.email : '').toLowerCase().trim();
  const first = (typeof body?.first === 'string' ? body.first : '').trim();
  const last = (typeof body?.last === 'string' ? body.last : '').trim();

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('certificates')
    .select(
      'credential_id, attendee_first, attendee_last, attendee_email, attendee_township, attendee_county, course_id, issued_at'
    )
    .eq('status', 'active')
    .order('issued_at', { ascending: false });

  // Look up by email, or by exact (case-insensitive) first + last name. Reject
  // insufficient/malformed input quietly with an empty result so we don't leak
  // which records exist — the caller renders the same empty state regardless.
  if (email) {
    if (!isLikelyEmail(email)) return NextResponse.json({ certificates: [] });
    query = query.eq('attendee_email', email);
  } else if (first && last) {
    query = query.ilike('attendee_first', first).ilike('attendee_last', last);
  } else {
    return NextResponse.json({ certificates: [] });
  }

  const { data: certs, error: certErr } = await query;
  if (certErr) return NextResponse.json({ error: certErr.message }, { status: 500 });

  if (!certs || certs.length === 0) {
    return NextResponse.json({ certificates: [] });
  }

  const courseIds = Array.from(new Set(certs.map((c) => c.course_id)));
  const [{ data: courses }, { data: sigs }] = await Promise.all([
    supabase.from('cert_courses').select('*').in('id', courseIds),
    supabase
      .from('cert_signatures')
      .select('*')
      .in('course_id', courseIds)
      .order('display_order', { ascending: true }),
  ]);

  const courseMap = new Map((courses || []).map((c: any) => [c.id, c]));
  const sigMap = new Map<string, any[]>();
  for (const s of sigs || []) {
    const arr = sigMap.get(s.course_id) || [];
    arr.push(s);
    sigMap.set(s.course_id, arr);
  }

  const result = certs
    .map((c) => {
      const course = courseMap.get(c.course_id);
      if (!course) return null;
      return {
        credential_id: c.credential_id,
        attendee_first: c.attendee_first,
        attendee_last: c.attendee_last,
        attendee_email: c.attendee_email,
        attendee_township: c.attendee_township,
        attendee_county: c.attendee_county,
        issued_at: c.issued_at,
        course: {
          course_id: course.course_id,
          name: course.name,
          hours: Number(course.hours),
          method: course.method,
          course_date: course.course_date,
          org_name: course.org_name,
          logo_url: course.logo_url,
        },
        signatures: (sigMap.get(c.course_id) || []).map((s) => ({
          signer_name: s.signer_name,
          signer_title: s.signer_title,
          signature_image_url: s.signature_image_url,
          signer_organization: s.signer_organization,
        })),
      };
    })
    .filter(Boolean);

  return NextResponse.json({ certificates: result });
}
