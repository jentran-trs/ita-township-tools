import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { formatCourseDates } from '@/lib/certificates/date-range';
import { formatEventTimes } from '@/lib/badges/attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — public event info for the scanner's PIN screen. No attendee data.
export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('cert_courses')
    .select('id, name, course_date, course_end_date, event_start_time, event_end_time, badge_checkin_enabled, scanner_pin_hash')
    .eq('id', params.courseId)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  return NextResponse.json({
    id: course.id,
    name: course.name,
    dates: formatCourseDates(course.course_date, course.course_end_date),
    times: formatEventTimes(course.event_start_time, course.event_end_time),
    scanning_open: !!course.badge_checkin_enabled && !!course.scanner_pin_hash,
  });
}
