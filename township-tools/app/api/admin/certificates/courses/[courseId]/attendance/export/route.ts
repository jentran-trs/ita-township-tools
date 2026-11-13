import ExcelJS from 'exceljs';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { loadCourseAttendance } from '@/lib/badges/admin-attendance';
import { easternTime } from '@/lib/badges/attendance';
import { formatCourseDates } from '@/lib/certificates/date-range';
import { townshipLabel } from '@/lib/certificates/township';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS = { attended: 'Attended', review: 'Needs review', no_show: 'No scans' } as const;

// GET — Excel file of everyone's check-in and check-out times per day (Eastern).
export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const data = await loadCourseAttendance(params.courseId);
  if (!data) return new Response('Course not found', { status: 404 });
  const { course, days, rows } = data;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Attendance');
  const dayLabel = (d: string) => formatCourseDates(d, null, 'short');
  ws.addRow([`${course.name} (${course.course_id})`]).font = { bold: true, size: 13 };
  ws.addRow([`${formatCourseDates(course.course_date, course.course_end_date)} · times are Eastern`]);
  ws.addRow([]);
  const header = [
    'Last Name', 'First Name', 'Email', 'Title', 'Township', 'County', 'Walk-in',
    ...days.flatMap((d) => [`${dayLabel(d)} In`, `${dayLabel(d)} Out`]),
    'Status', 'Needs review because', 'Payment', 'Credit Hours',
  ];
  const METHOD: Record<string, string> = { check: 'check', card: 'credit card', admin: 'marked paid', amo: 'AMO' };
  const paymentText = (r: any) =>
    r.payment_status === 'due'
      ? `Due${r.balance_due ? ` $${Number(r.balance_due).toFixed(2)}` : ''}`
      : r.payment_status === 'paid'
        ? `Paid (${METHOD[r.payment_method] || 'paid'})`
        : '';
  const h = ws.addRow(header);
  h.font = { bold: true };
  h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

  for (const r of rows) {
    const row = ws.addRow([
      r.last_name, r.first_name, r.email, r.title || '', townshipLabel(r.township) || '',
      r.county ? `${r.county} County` : '', r.is_walk_in ? 'Yes' : '',
      ...r.attendance.days.flatMap((d) => [d.checkIn ? easternTime(d.checkIn) : '', d.checkOut ? easternTime(d.checkOut) : '']),
      STATUS[r.status], r.status === 'review' ? r.reasons.join('; ') : '', paymentText(r), r.credit_hours,
    ]);
    if (r.status === 'review') row.getCell(header.length - 3).font = { color: { argb: 'FFB45309' }, bold: true };
  }
  ws.columns.forEach((c, i) => (c.width = i < 3 ? 22 : i < 7 ? 18 : i === header.length - 3 ? 36 : 14));
  ws.views = [{ state: 'frozen', ySplit: 4, xSplit: 2 }];

  const buf = await wb.xlsx.writeBuffer();
  const safe = `${course.course_id}-attendance`.replace(/[^A-Za-z0-9_-]+/g, '-');
  return new Response(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safe}.xlsx"`,
    },
  });
}
