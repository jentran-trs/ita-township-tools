import { notFound, redirect } from 'next/navigation';
import { isSuperadmin } from '@/lib/auth/superadmin';
import { loadCourseAttendance } from '@/lib/badges/admin-attendance';
import { easternTime } from '@/lib/badges/attendance';
import { formatCourseDates } from '@/lib/certificates/date-range';
import { townshipLabel } from '@/lib/certificates/township';
import { AmoChecklistClient, ChecklistPerson } from './AmoChecklistClient';

export const dynamic = 'force-dynamic';

// Printable list for updating each person's attendance by hand in AMO.
export default async function AmoChecklistPage({ params }: { params: { courseId: string } }) {
  if (!(await isSuperadmin())) redirect('/admin/contact-verification');
  const data = await loadCourseAttendance(params.courseId);
  if (!data) notFound();
  const { course, days, rows } = data;

  const people: ChecklistPerson[] = rows.map((r) => ({
    id: r.id,
    lastName: r.last_name,
    firstName: r.first_name,
    email: r.email,
    place:
      [townshipLabel(r.township), r.county ? `${r.county} County` : null].filter(Boolean).join(', ') ||
      (r as any).organization ||
      '',
    walkIn: r.is_walk_in,
    status: r.status,
    reasons: r.reasons,
    times: r.attendance.days.map((d) => ({
      day: formatCourseDates(d.date, null, 'short').replace(/, \d{4}$/, ''),
      in: d.checkIn ? easternTime(d.checkIn) : null,
      out: d.checkOut ? easternTime(d.checkOut) : null,
    })),
  }));

  return (
    <AmoChecklistClient
      courseId={params.courseId}
      courseName={course.name}
      courseCode={course.course_id}
      dates={formatCourseDates(course.course_date, course.course_end_date)}
      multiDay={days.length > 1}
      people={people}
    />
  );
}
