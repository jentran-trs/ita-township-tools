import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { loadCourseAttendance } from '@/lib/badges/admin-attendance';
import { easternDate, easternToUtc } from '@/lib/badges/attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { courseId: string } };

// GET — attendance for every registrant, with the "in and out every day" rule applied.
export async function GET(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const data = await loadCourseAttendance(params.courseId);
  if (!data) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  return NextResponse.json({
    days: data.days,
    course: { hours: Number(data.course.hours), event_start_time: data.course.event_start_time, event_end_time: data.course.event_end_time },
    rows: data.rows,
  });
}

async function adminName(): Promise<string> {
  try {
    const a = await auth();
    if (a?.userId) {
      const u = await currentUser();
      return u?.primaryEmailAddress?.emailAddress || u?.fullName || 'ITA admin';
    }
  } catch {}
  return 'ITA admin';
}

// POST — manual check-in/out after Jen verifies someone was there.
//   { registrant_id, date: "YYYY-MM-DD", direction: "in"|"out", time: "HH:MM" (Eastern), note? }
// DELETE ?scan_date=&registrant_id=&direction= — void that day's scans of that
//   direction (e.g. a mistaken check-out). Scans are kept, only marked void.
export async function POST(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!['in', 'out'].includes(b.direction)) return NextResponse.json({ error: 'direction must be in or out' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  if (!/^\d{2}:\d{2}$/.test(b.time || '')) return NextResponse.json({ error: 'time must be HH:MM' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: reg } = await supabase
    .from('cert_registrants')
    .select('id')
    .eq('id', b.registrant_id)
    .eq('course_id', params.courseId)
    .maybeSingle();
  if (!reg) return NextResponse.json({ error: 'Registrant not found for this course' }, { status: 404 });

  const at = easternToUtc(b.date, b.time);
  const { error } = await supabase.from('cert_attendance_scans').insert({
    course_id: params.courseId,
    registrant_id: reg.id,
    scan_date: easternDate(at),
    direction: b.direction,
    scanned_at: at.toISOString(),
    source: 'manual',
    entered_by: await adminName(),
    note: typeof b.note === 'string' ? b.note.trim().slice(0, 300) || null : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const url = new URL(req.url);
  const registrantId = url.searchParams.get('registrant_id');
  const scanDate = url.searchParams.get('scan_date');
  const direction = url.searchParams.get('direction');
  if (!registrantId || !scanDate || !['in', 'out'].includes(direction || '')) {
    return NextResponse.json({ error: 'registrant_id, scan_date and direction are required' }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('cert_attendance_scans')
    .update({ voided_at: new Date().toISOString() })
    .eq('course_id', params.courseId)
    .eq('registrant_id', registrantId)
    .eq('scan_date', scanDate)
    .eq('direction', direction!)
    .is('voided_at', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
