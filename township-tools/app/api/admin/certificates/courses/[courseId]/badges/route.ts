import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { hashPin, isValidPin, PIN_MAX_LENGTH, PIN_MIN_LENGTH } from '@/lib/badges/pin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { courseId: string } };

const COURSE_FIELDS =
  'id, course_id, name, hours, cert_type, course_date, course_end_date, badge_checkin_enabled, event_start_time, event_end_time, badge_tagline, scanner_pin_hash';

// GET — badge settings + registrant list for one course.
export async function GET(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const supabase = createServerSupabaseClient();

  const { data: course, error } = await supabase
    .from('cert_courses')
    .select(COURSE_FIELDS)
    .eq('id', params.courseId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

  const { data: registrants, error: rErr } = await supabase
    .from('cert_registrants')
    .select('id, first_name, last_name, email, title, registrant_type, organization, township, county, badge_token, is_walk_in, day_hours, certificate_id, created_at')
    .eq('course_id', course.id)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const { scanner_pin_hash, ...rest } = course as any;
  return NextResponse.json({
    course: { ...rest, has_pin: !!scanner_pin_hash },
    registrants: registrants || [],
  });
}

// PATCH — update badge settings. Body (all optional):
//   badge_checkin_enabled boolean
//   event_start_time / event_end_time  "HH:MM" | null
//   scanner_pin  string (4–12 letters/digits) | null to disable scanning
export async function PATCH(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('cert_courses')
    .select('id, scanner_pin_version')
    .eq('id', params.courseId)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

  const patch: Record<string, any> = {};
  if (body.badge_checkin_enabled !== undefined) patch.badge_checkin_enabled = !!body.badge_checkin_enabled;
  if ('badge_tagline' in body) {
    const t = typeof body.badge_tagline === 'string' ? body.badge_tagline.trim() : '';
    if (t.length > 80) return NextResponse.json({ error: 'Tagline must be 80 characters or fewer' }, { status: 400 });
    patch.badge_tagline = t || null;
  }

  for (const key of ['event_start_time', 'event_end_time'] as const) {
    if (key in body) {
      const v = body[key];
      if (v === null || v === '') patch[key] = null;
      else if (typeof v === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(v)) patch[key] = v;
      else return NextResponse.json({ error: `${key} must be HH:MM` }, { status: 400 });
    }
  }
  const start = patch.event_start_time ?? body.event_start_time;
  const end = patch.event_end_time ?? body.event_end_time;
  if (start && end && end <= start) {
    return NextResponse.json({ error: 'End time must be after the start time' }, { status: 400 });
  }

  if ('scanner_pin' in body) {
    const pin = body.scanner_pin;
    if (pin === null || pin === '') {
      patch.scanner_pin_hash = null;
    } else if (typeof pin === 'string' && isValidPin(pin.trim())) {
      patch.scanner_pin_hash = hashPin(course.id, pin.trim());
    } else {
      return NextResponse.json(
        { error: `PIN must be ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} numbers (no letters)` },
        { status: 400 }
      );
    }
    // Any PIN change signs out every phone that unlocked the old PIN.
    patch.scanner_pin_version = (course.scanner_pin_version || 0) + 1;
  }

  if (!Object.keys(patch).length) return NextResponse.json({ ok: true });

  const { error } = await supabase.from('cert_courses').update(patch).eq('id', course.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
