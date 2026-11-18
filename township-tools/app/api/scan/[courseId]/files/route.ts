import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireScanSession } from '@/lib/badges/scan-session';
import { listPrintFiles, setPrinted } from '@/lib/badges/print-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { courseId: string } };

// GET — files to print for the event, for whoever prints (event PIN).
export async function GET(_req: Request, { params }: RouteParams) {
  const s = await requireScanSession(params.courseId);
  if (s.error) return s.error;
  const supabase = createServerSupabaseClient();
  return NextResponse.json({ files: await listPrintFiles(supabase, s.course.id) });
}

// PATCH { id, printed } — tick "Printed" (or untick).
export async function PATCH(req: Request, { params }: RouteParams) {
  const s = await requireScanSession(params.courseId);
  if (s.error) return s.error;
  const b = await req.json().catch(() => null);
  if (!b?.id || typeof b.printed !== 'boolean') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const supabase = createServerSupabaseClient();
  const { error } = await setPrinted(supabase, s.course.id, String(b.id), b.printed, 'Print page');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
