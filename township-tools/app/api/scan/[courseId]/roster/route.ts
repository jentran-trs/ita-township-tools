import { inPlaceOf } from '@/lib/badges/registrant-edit';
import { NextResponse } from 'next/server';
import { assignWalkInNumbers } from '@/lib/badges/badge-numbers';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireScanSession } from '@/lib/badges/scan-session';
import { eventDays } from '@/lib/badges/attendance';
import { loadPriorUnpaid } from '@/lib/badges/prior-unpaid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — everything the phone needs to scan offline: the registrant list
// (with badge codes) and every scan recorded so far.
export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  const s = await requireScanSession(params.courseId);
  if (s.error) return s.error;
  const { course } = s;
  const supabase = createServerSupabaseClient();

  // Walk-ins are numbered in the order they arrived (catches any not numbered yet).
  await assignWalkInNumbers(supabase, course.id);

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
  // Still owes for an earlier event (matched by email or name): collect at the door.
  const prior = await loadPriorUnpaid(supabase, course, registrants || []);

  return NextResponse.json({
    event: {
      id: course.id,
      name: course.name,
      days: eventDays(course.course_date, course.course_end_date),
      start_time: course.event_start_time,
      end_time: course.event_end_time,
      tagline: course.badge_tagline ?? null,
    },
    // Only what the door needs (no emails etc. on volunteers' phones).
    registrants: (registrants || []).map((r: any) => ({
      id: r.id,
      first_name: r.first_name,
      last_name: r.last_name,
      title: r.title,
      township: r.township,
      county: r.county,
      organization: r.organization ?? null,
      badge_token: r.badge_token,
      is_walk_in: r.is_walk_in,
      badge_number: r.badge_number ?? null,
      walkin_number: r.walkin_number ?? null,
      prior_unpaid: (prior.get(r.id) || []).map((d) => ({
        registrant_id: d.registrant_id,
        course_name: d.course_name,
        balance_due: d.balance_due,
        matched_by: d.matched_by,
      })),
      payment_status: r.payment_status ?? null,
      balance_due: r.balance_due != null ? Number(r.balance_due) : null,
      // Someone else is attending on this registration (v44).
      in_place_of: inPlaceOf(r),
    })),
    scans: scans || [],
  });
}
