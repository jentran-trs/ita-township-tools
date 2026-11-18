import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireScanSession } from '@/lib/badges/scan-session';
import { townshipLabel } from '@/lib/certificates/township';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — the list for the "Find my badge number" screen at the check-in area.
// Unlocked with the event PIN. Only what that public screen shows: name,
// township/county or company, and badge number. Only pre-registered people
// with a printed badge number (walk-ins go to the table).
export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  const s = await requireScanSession(params.courseId);
  if (s.error) return s.error;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cert_registrants')
    .select('*')
    .eq('course_id', s.course.id)
    .eq('is_walk_in', false)
    .is('cancelled_at', null)
    .not('badge_number', 'is', null)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    event: { name: s.course.name },
    people: (data || []).map((r: any) => ({
      first: r.first_name,
      last: r.last_name,
      place:
        [townshipLabel(r.township), r.county ? `${r.county} County` : null].filter(Boolean).join(', ') || r.organization || '',
      number: r.badge_number,
    })),
  });
}
