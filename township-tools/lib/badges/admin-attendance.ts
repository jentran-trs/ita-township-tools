import { createServerSupabaseClient } from '@/lib/supabase';
import { computeAttendance, eventDays, AttendanceResult } from '@/lib/badges/attendance';

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
  attendance: AttendanceResult;
  status: 'attended' | 'review' | 'no_show';
  // Hours that would go on the certificate.
  credit_hours: number;
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
      .select('id, first_name, last_name, email, title, township, county, is_walk_in, day_hours, certificate_id')
      .eq('course_id', course.id)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true }),
    supabase
      .from('cert_attendance_scans')
      .select('registrant_id, scan_date, direction, scanned_at, voided_at')
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
    const status: AttendanceRow['status'] = attendance.attended ? 'attended' : attendance.anyScan ? 'review' : 'no_show';
    const credit = r.day_hours
      ? Math.round(days.reduce((sum, d) => sum + (Number(r.day_hours[d]) || 0), 0) * 10) / 10
      : status === 'attended'
        ? Number(course.hours)
        : 0;
    return { ...r, attendance, status, credit_hours: credit };
  });

  return { course, days, rows };
}
