import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// Scanner sessions. After a volunteer enters the event PIN, the phone gets an
// httpOnly cookie scoped to that event's /api/scan path, signed with a server
// secret and tied to the course's scanner_pin_version, so changing the PIN
// (or clearing it) signs every phone out immediately.

const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // two weeks covers prep + multi-day events

function secret(): string {
  const s = process.env.SCANNER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No scanner session secret configured');
  return s;
}

export function cookieName(courseId: string) {
  return `tt_scan_${courseId.replace(/[^a-zA-Z0-9]/g, '')}`;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSessionValue(courseId: string, pinVersion: number): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${courseId}.${pinVersion}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function setSessionCookie(res: NextResponse, courseId: string, pinVersion: number) {
  res.cookies.set(cookieName(courseId), createSessionValue(courseId, pinVersion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/scan',
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Route guard for scanner APIs. Returns the course row when the request has a
 * valid session for it, or a 401/404/409 response to return as-is.
 */
export async function requireScanSession(
  courseId: string
): Promise<{ course: any; error?: never } | { course?: never; error: NextResponse }> {
  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('cert_courses')
    .select('id, name, course_date, course_end_date, event_start_time, event_end_time, badge_checkin_enabled, scanner_pin_hash, scanner_pin_version')
    .eq('id', courseId)
    .maybeSingle();
  if (!course) return { error: NextResponse.json({ error: 'Event not found' }, { status: 404 }) };
  if (!course.badge_checkin_enabled || !course.scanner_pin_hash) {
    return { error: NextResponse.json({ error: 'Scanning is turned off for this event' }, { status: 409 }) };
  }

  const raw = cookies().get(cookieName(courseId))?.value;
  const unauthorized = { error: NextResponse.json({ error: 'Enter the event PIN', code: 'pin_required' }, { status: 401 }) };
  if (!raw) return unauthorized;
  const parts = raw.split('.');
  if (parts.length !== 4) return unauthorized;
  const [cid, ver, exp, sig] = parts;
  const expected = sign(`${cid}.${ver}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return unauthorized;
  if (cid !== course.id) return unauthorized;
  if (Number(ver) !== (course.scanner_pin_version || 0)) return unauthorized;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return unauthorized;
  return { course };
}
