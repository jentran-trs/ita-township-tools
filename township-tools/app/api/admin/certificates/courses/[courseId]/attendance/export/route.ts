import ExcelJS from 'exceljs';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { loadCourseAttendance } from '@/lib/badges/admin-attendance';
import { easternDate, easternTime } from '@/lib/badges/attendance';
import { badgeNumberLabel } from '@/lib/badges/badge-numbers';
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
    'Badge #', 'Last Name', 'First Name', 'Email', 'Title', 'Township', 'County', 'Walk-in',
    ...days.flatMap((d) => [`${dayLabel(d)} In`, `${dayLabel(d)} Out`]),
    'Status', 'Needs review because', 'Payment', 'Credit Hours', 'Notes',
  ];
  const SOURCE: Record<string, string> = { scan: 'Badge scan', name_search: 'Name search', manual: 'Entered by hand' };
  const shortDay = (d: string) => formatCourseDates(d, null, 'short').replace(/, \d{4}$/, '');
  // Every note on someone's record: hand-entered times and removed times.
  const notesFor = (r: (typeof rows)[number]) =>
    r.log
      .flatMap((e) => {
        const what = `${shortDay(e.date)} ${e.direction === 'in' ? 'check-in' : 'check-out'} ${easternTime(e.at)}`;
        const out: string[] = [];
        if (e.source === 'manual') out.push(`${what} entered by hand${e.by ? ` by ${e.by}` : ''}${e.note ? `: ${e.note}` : ''}`);
        if (e.voided_at) out.push(`${what} removed${e.voided_by ? ` by ${e.voided_by}` : ''}${e.void_note ? `: ${e.void_note}` : ''}`);
        return out;
      })
      .join('\n');
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
      badgeNumberLabel(r as any), r.last_name, r.first_name, r.email, r.title || '', townshipLabel(r.township) || '',
      r.county ? `${r.county} County` : '', r.is_walk_in ? 'Yes' : '',
      ...r.attendance.days.flatMap((d) => [d.checkIn ? easternTime(d.checkIn) : '', d.checkOut ? easternTime(d.checkOut) : '']),
      STATUS[r.status], r.status === 'review' ? r.reasons.join('; ') : '', paymentText(r), r.credit_hours, notesFor(r),
    ]);
    row.getCell(header.length).alignment = { wrapText: true, vertical: 'top' };
    if (r.status === 'review') row.getCell(header.length - 4).font = { color: { argb: 'FFB45309' }, bold: true };
  }
  ws.columns.forEach((c, i) => (c.width = i === 0 ? 12 : i < 4 ? 22 : i < 8 ? 18 : i === header.length - 4 ? 36 : i === header.length - 1 ? 60 : 14));
  ws.views = [{ state: 'frozen', ySplit: 4, xSplit: 3 }];

  // Second sheet: every check-in/out entry, oldest first, nothing left out.
  const log = wb.addWorksheet('Check-in log');
  log.addRow([`${course.name} (${course.course_id}) · every check-in and check-out, including removed ones · times are Eastern`]).font = { bold: true };
  log.addRow([]);
  const lh = log.addRow(['Last Name', 'First Name', 'Day', 'In/Out', 'Time', 'How', 'Recorded by', 'Note', 'Removed', 'Removed by', 'Why removed']);
  lh.font = { bold: true };
  lh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  const entries = rows
    .flatMap((r) => r.log.map((e) => ({ r, e })))
    .sort((a, b) => a.e.at.localeCompare(b.e.at));
  for (const { r, e } of entries) {
    const lr = log.addRow([
      r.last_name, r.first_name, shortDay(e.date), e.direction === 'in' ? 'In' : 'Out', easternTime(e.at),
      SOURCE[e.source] || e.source, e.by || '', e.note || '',
      e.voided_at ? `${shortDay(easternDate(e.voided_at))} ${easternTime(e.voided_at)}` : '', e.voided_by || '', e.void_note || '',
    ]);
    if (e.voided_at) lr.font = { color: { argb: 'FF9CA3AF' }, strike: false };
  }
  log.columns.forEach((c, i) => (c.width = [18, 16, 10, 8, 10, 16, 26, 40, 16, 26, 40][i] || 14));
  log.views = [{ state: 'frozen', ySplit: 3 }];

  const buf = await wb.xlsx.writeBuffer();
  const safe = `${course.course_id}-attendance`.replace(/[^A-Za-z0-9_-]+/g, '-');
  return new Response(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safe}.xlsx"`,
    },
  });
}
