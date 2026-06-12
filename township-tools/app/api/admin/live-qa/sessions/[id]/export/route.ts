import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteParams = { params: { id: string } };

const STATUS_LABEL: Record<string, string> = {
  pending: 'Incoming',
  approved: 'Approved (on board)',
  dismissed: 'Dismissed',
};

// Eastern (Indiana) time, readable for print.
function fmt(ts: string | null): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('en-US', {
      timeZone: 'America/Indiana/Indianapolis',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function safeSheetName(title: string): string {
  // Excel sheet names: max 31 chars, no : \ / ? * [ ]
  const cleaned = title.replace(/[\\/?*:[\]]/g, ' ').trim() || 'Questions';
  return cleaned.slice(0, 31);
}

function safeFilename(title: string): string {
  return (title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'live-qa').slice(0, 60);
}

// GET — export all questions for a session as a clean, print-friendly .xlsx.
export async function GET(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();

  const { data: session, error: sessErr } = await supabase
    .from('lqa_sessions')
    .select('title, created_at')
    .eq('id', params.id)
    .maybeSingle();
  if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { data: questions, error: qErr } = await supabase
    .from('lqa_questions')
    .select('question, name, township, county, status, created_at, approved_at, dismissed_at')
    .eq('session_id', params.id)
    .order('created_at', { ascending: true });
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const rows = questions || [];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(safeSheetName(session.title), {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const COLS = [
    { header: '#', key: 'num', width: 5 },
    { header: 'Question', key: 'question', width: 60 },
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Township', key: 'township', width: 18 },
    { header: 'County', key: 'county', width: 16 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Submitted', key: 'submitted', width: 20 },
    { header: 'Approved', key: 'approved', width: 20 },
    { header: 'Dismissed', key: 'dismissed', width: 20 },
  ];
  ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }));

  // Title block (rows 1-3), headers on row 4, data from row 5. Frozen at row 4.
  const lastCol = COLS.length;
  ws.mergeCells(1, 1, 1, lastCol);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = session.title;
  titleCell.font = { bold: true, size: 16 };

  ws.mergeCells(2, 1, 2, lastCol);
  const subCell = ws.getCell(2, 1);
  subCell.value = `Exported ${fmt(new Date().toISOString())} · ${rows.length} question${rows.length === 1 ? '' : 's'}`;
  subCell.font = { italic: true, color: { argb: 'FF6B7280' } };

  const headerRow = ws.getRow(4);
  COLS.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    cell.alignment = { vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
  });
  headerRow.commit?.();

  rows.forEach((r: any, idx: number) => {
    const row = ws.getRow(5 + idx);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = r.question || '';
    row.getCell(3).value = r.name || '';
    row.getCell(4).value = r.township || '';
    row.getCell(5).value = r.county || '';
    row.getCell(6).value = STATUS_LABEL[r.status] || r.status || '';
    row.getCell(7).value = fmt(r.created_at);
    row.getCell(8).value = fmt(r.approved_at);
    row.getCell(9).value = fmt(r.dismissed_at);
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    row.getCell(1).alignment = { vertical: 'top' };
    row.commit?.();
  });

  // Repeat the header row when printed across multiple pages.
  ws.pageSetup.printTitlesRow = '4:4';
  // Autofilter over the header + data range.
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: lastCol } };

  const filenameBase = `live-qa-${safeFilename(session.title)}-${new Date().toISOString().slice(0, 10)}`;
  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
    },
  });
}
