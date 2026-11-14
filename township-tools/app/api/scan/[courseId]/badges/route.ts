import { NextResponse } from 'next/server';
import { requireScanSession } from '@/lib/badges/scan-session';
import { loadBadgePrintData } from '@/lib/badges/print-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET — badges for printing, for whoever prints them (e.g. Lydia). Unlocked
// with the same event PIN as the scanner; no Township Tools login needed.
export async function GET(req: Request, { params }: { params: { courseId: string } }) {
  const s = await requireScanSession(params.courseId);
  if (s.error) return s.error;
  // ?from=251&to=260 prints just those badge numbers (e.g. late registrants).
  const url = new URL(req.url);
  const from = parseInt(url.searchParams.get('from') || '', 10) || null;
  const to = parseInt(url.searchParams.get('to') || '', 10) || null;
  const data = await loadBadgePrintData(params.courseId, [], { from, to });
  if (!data) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  return NextResponse.json(data);
}
