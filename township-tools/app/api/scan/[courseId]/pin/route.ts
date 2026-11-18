import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireScanSession } from '@/lib/badges/scan-session';
import { decryptPin } from '@/lib/badges/pin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — the event PIN, for the scanner's Share screen (so a team member can
// sign in). Only for a phone that is already unlocked with that same PIN.
export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  const s = await requireScanSession(params.courseId);
  if (s.error) return s.error;
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from('cert_courses').select('scanner_pin_enc').eq('id', s.course.id).maybeSingle();
  return NextResponse.json({ pin: decryptPin(s.course.id, data?.scanner_pin_enc) }, { headers: { 'Cache-Control': 'no-store' } });
}
