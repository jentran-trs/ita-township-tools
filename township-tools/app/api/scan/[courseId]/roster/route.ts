import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireScanSession } from '@/lib/badges/scan-session';
import { eventDays } from '@/lib/badges/attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — everything the phone needs to scan offline: the registrant list
// (with badge codes) and every scan recorded so far.
export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  const s = await requireScanSession(params.courseId);
  if (s.error) return s.error;
  const { course } = s;
  const supabase = createServerSupabaseClient();

  const [{ data: registrants, error: rErr }, { data: scans, error: sErr }] = await Promise.all([
    supabase
      .from('cert_registrants')
      .select('*')
      .eq('course_id', course.id)
      .order('last_name', { ascending: true }),
    supabase
      .from('cert_attendance_scans')
      .select('client_scan_id, registrant_id, scan_date, direction, scanned_at')
      .eq('course_id', course.id)
      .is('voided_at', null),
  ]);
  if (rErr || sErr) return NextResponse.json({ error: (rErr || sErr)!.message }, { status: 500 });

  return NextResponse.json({
    event: {
      id: course.id,
      name: course.name,
      days: eventDays(course.course_date, course.course_end_date),
      start_time: course.event_start_time,
      end_time: course.event_end_time,
    },
    // Only what the door needs (no emails etc. on volunteers' phones).
    registrants: (registrants || []).map((r: any) => ({
      id: r.id,
      first_name: r.first_name,
      last_name: r.last_name,
      title: r.title,
      township: r.township,
      county: r.county,
      badge_token: r.badge_token,
      is_walk_in: r.is_walk_in,
      payment_status: r.payment_status ?? null,
      balance_due: r.balance_due != null ? Number(r.balance_due) : null,
    })),
    scans: scans || [],
  });
}
