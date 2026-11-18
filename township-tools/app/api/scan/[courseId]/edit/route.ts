import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireScanSession } from '@/lib/badges/scan-session';
import { editRegistrantDetails, inPlaceOf } from '@/lib/badges/registrant-edit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST — fix a registrant's badge details from the scanner (e.g. a name typo
// noticed at check-in) so a new NIIMBOT label can be printed. Event PIN only.
// Body: { registrant_id, first_name, last_name, email, title, township, county, organization, substitute? }
// substitute: true = someone else is attending on this registration (the
// original registrant is kept in substituted_for).
export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  const s = await requireScanSession(params.courseId);
  if (s.error) return s.error;
  const body = await req.json().catch(() => null);
  if (!body?.registrant_id) return NextResponse.json({ error: 'Missing person' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: current } = await supabase
    .from('cert_registrants')
    .select('*')
    .eq('id', String(body.registrant_id))
    .eq('course_id', s.course.id)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: 'Person not found for this event' }, { status: 404 });

  const { registrant_id: _id, substitute, ...fields } = body;
  const allowed = ['first_name', 'last_name', 'email', 'title', 'township', 'county', 'organization'];
  const input = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));
  const r = await editRegistrantDetails(supabase, current, input, { substitute: substitute === true, by: 'Scanner' });
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  const p = r.registrant;
  return NextResponse.json({
    ok: true,
    // Same shape as the scanner roster.
    person: {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      title: p.title,
      township: p.township,
      county: p.county,
      organization: p.organization ?? null,
      badge_token: p.badge_token,
      is_walk_in: p.is_walk_in,
      badge_number: p.badge_number ?? null,
      walkin_number: p.walkin_number ?? null,
      payment_status: p.payment_status ?? null,
      balance_due: p.balance_due != null ? Number(p.balance_due) : null,
      in_place_of: inPlaceOf(p),
    },
  });
}
