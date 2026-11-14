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
  // What to store in certificates.hours_override (null = course hours).
  cert_hours_override: number | null;
  // Days with both a check-in and a check-out.
  days_attended: number;
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
    // '*' so the v38 day_hours column is read when present.
    .select('*')
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
    // Hours per day set on the course: each full day earns its hours, and a
    // day someone simply didn't come isn't a problem, just fewer hours.
    const plan = dayPlan(course.day_hours, days);
    if (attendance.anyScan) {
      for (const d of attendance.days) {
        const label = formatCourseDates(d.date, null, 'short').replace(/, \d{4}$/, '');
        if (d.checkIn && !d.checkOut) reasons.push(`No check-out on ${label}`);
        else if (!d.checkIn && d.checkOut) reasons.push(`No check-in on ${label}`);
        else if (!d.checkIn && !d.checkOut && !plan) reasons.push(`Not scanned on ${label}`);
      }
    }
    const attendanceOk = attendance.anyScan && reasons.length === 0;
    if (r.payment_status === 'due') {
      const owed = r.balance_due != null && Number(r.balance_due) > 0 ? ` ($${Number(r.balance_due).toFixed(2)} due)` : '';
      reasons.push(`Payment not completed${owed}`);
    }
    const status: AttendanceRow['status'] = !attendance.anyScan ? 'no_show' : reasons.length ? 'review' : 'attended';
    const courseHours = Number(course.hours);
    const daysAttended = attendance.days.filter((d) => d.complete).length;
    const earned = plan
      ? round1(attendance.days.reduce((sum, d) => sum + (d.complete ? plan[d.date] : 0), 0))
      : attendance.attended
        ? courseHours
        : 0;
    // Partial credit entered by hand wins; otherwise what they earned.
    const credit = r.day_hours ? round1(days.reduce((sum, d) => sum + (Number(r.day_hours[d]) || 0), 0)) : earned;
    const complete = plan ? attendanceOk && earned > 0 : attendance.attended;
    const override = r.day_hours ? credit : plan && complete && earned !== courseHours ? earned : null;
    return {
      ...r,
      balance_due: r.balance_due != null ? Number(r.balance_due) : null,
      payment_status: r.payment_status ?? null,
      payment_method: r.payment_method ?? null,
      attendance,
      attendance_complete: complete,
      status,
      reasons,
      credit_hours: credit,
      cert_hours_override: override,
      days_attended: daysAttended,
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

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The course's hours per day, if set for every event day (v38). Returns null
 * when not set, so the course uses the all-days rule.
 */
export function dayPlan(raw: unknown, days: string[]): Record<string, number> | null {
  if (!raw || typeof raw !== 'object' || days.length < 2) return null;
  const plan: Record<string, number> = {};
  for (const d of days) {
    const v = Number((raw as any)[d]);
    if (!Number.isFinite(v) || v < 0) return null;
    plan[d] = v;
  }
  return plan;
}
