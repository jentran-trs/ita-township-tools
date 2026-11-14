import { createServerSupabaseClient } from '@/lib/supabase';
import { computeAttendance, eventDays, AttendanceResult } from '@/lib/badges/attendance';
import { formatCourseDates } from '@/lib/certificates/date-range';

/** One check-in/out entry, including removed ones, with any notes. */
export type ScanLogEntry = {
  id: string;
  date: string;
  direction: 'in' | 'out';
  at: string;
  source: 'scan' | 'name_search' | 'manual';
  // Scanner phone label, or the admin who entered it by hand.
  by: string | null;
  note: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_note: string | null;
};

export type AttendanceRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  title: string | null;
  township: string | null;
  county: string | null;
  is_walk_in: boolean;
  day_hours: Record<string, number> | null;
  certificate_id: string | null;
  balance_due: number | null;
  payment_status: 'paid' | 'due' | null;
  payment_method: string | null;
  attendance: AttendanceResult;
  // Checked in and out on every day.
  attendance_complete: boolean;
  status: 'attended' | 'review' | 'no_show';
  // Plain-English reasons someone needs review, e.g. "No check-out on Dec 10".
  reasons: string[];
  // Hours that would go on the certificate.
  credit_hours: number;
  // Every entry for this person, oldest first (removed ones included).
  log: ScanLogEntry[];
};

export type CourseAttendance = {
  course: any;
  days: string[];
  rows: AttendanceRow[];
};

/** Registrants + scans for one course, with the attendance rule applied. */
export async function loadCourseAttendance(courseId: string): Promise<CourseAttendance | null> {
  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase
    .from('cert_courses')
    .select('id, course_id, name, hours, cert_type, course_date, course_end_date, event_start_time, event_end_time, badge_checkin_enabled')
    .eq('id', courseId)
    .maybeSingle();
  if (!course) return null;

  const [{ data: regs }, { data: scans }] = await Promise.all([
    supabase
      .from('cert_registrants')
      .select('*')
      .eq('course_id', course.id)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true }),
    supabase
      .from('cert_attendance_scans')
      // '*' so the v37 void note columns are read when present.
      .select('*')
      .eq('course_id', course.id),
  ]);

  const days = eventDays(course.course_date, course.course_end_date);
  const byPerson = new Map<string, any[]>();
  (scans || []).forEach((s: any) => {
    const list = byPerson.get(s.registrant_id) || [];
    list.push(s);
    byPerson.set(s.registrant_id, list);
  });

  const rows: AttendanceRow[] = (regs || []).map((r: any) => {
    const attendance = computeAttendance(days, byPerson.get(r.id) || []);
    const reasons: string[] = [];
    if (attendance.anyScan) {
      for (const d of attendance.days) {
        const label = formatCourseDates(d.date, null, 'short').replace(/, \d{4}$/, '');
        if (d.checkIn && !d.checkOut) reasons.push(`No check-out on ${label}`);
        else if (!d.checkIn && d.checkOut) reasons.push(`No check-in on ${label}`);
        else if (!d.checkIn && !d.checkOut) reasons.push(`Not scanned on ${label}`);
      }
    }
    if (r.payment_status === 'due') {
      const owed = r.balance_due != null && Number(r.balance_due) > 0 ? ` ($${Number(r.balance_due).toFixed(2)} due)` : '';
      reasons.push(`Payment not completed${owed}`);
    }
    const status: AttendanceRow['status'] = !attendance.anyScan ? 'no_show' : reasons.length ? 'review' : 'attended';
    const credit = r.day_hours
      ? Math.round(days.reduce((sum, d) => sum + (Number(r.day_hours[d]) || 0), 0) * 10) / 10
      : attendance.attended
        ? Number(course.hours)
        : 0;
    return {
      ...r,
      balance_due: r.balance_due != null ? Number(r.balance_due) : null,
      payment_status: r.payment_status ?? null,
      payment_method: r.payment_method ?? null,
      attendance,
      attendance_complete: attendance.attended,
      status,
      reasons,
      credit_hours: credit,
      log: (byPerson.get(r.id) || [])
        .slice()
        .sort((a: any, b: any) => String(a.scanned_at).localeCompare(String(b.scanned_at)))
        .map((x: any) => ({
          id: x.id,
          date: x.scan_date,
          direction: x.direction,
          at: x.scanned_at,
          source: x.source || 'scan',
          by: x.entered_by || x.device_label || null,
          note: x.note || null,
          voided_at: x.voided_at || null,
          voided_by: x.voided_by || null,
          void_note: x.void_note || null,
        })),
    };
  });

  return { course, days, rows };
}
