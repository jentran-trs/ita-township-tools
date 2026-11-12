import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { pinMatches } from '@/lib/badges/pin';
import { setSessionCookie } from '@/lib/badges/scan-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { pin } — unlock the scanner for this event on this phone.
export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  let pin = '';
  try {
    pin = String((await req.json()).pin || '').trim();
  } catch {}

  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('cert_courses')
    .select('id, badge_checkin_enabled, scanner_pin_hash, scanner_pin_version')
    .eq('id', params.courseId)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!course.badge_checkin_enabled || !course.scanner_pin_hash) {
    return NextResponse.json({ error: 'Scanning is turned off for this event' }, { status: 409 });
  }
  if (!pin || !pinMatches(course.id, pin, course.scanner_pin_hash)) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, course.id, course.scanner_pin_version || 0);
  return res;
}
