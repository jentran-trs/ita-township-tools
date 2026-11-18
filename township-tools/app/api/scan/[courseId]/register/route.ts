import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireScanSession } from '@/lib/badges/scan-session';
import { generateBadgeToken } from '@/lib/badges/token';
import { assignWalkInNumbers } from '@/lib/badges/badge-numbers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = ['Attendee', 'Sponsor', 'Speaker', 'Resource Vendor', 'Staff'];
const text = (v: unknown, max: number) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

// POST — a walk-in registers themselves on the check-in tablet (the Find My
// Badge Number screen, unlocked with the event PIN). No payment here: they
// wait in the scanner's "Waiting at the desk" list until the desk records
// payment, checks them in and prints their label.
// Body: { first_name, last_name, email, title?, registrant_type?, township?, county?, organization? }
export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  const s = await requireScanSession(params.courseId);
  if (s.error) return s.error;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Missing details' }, { status: 400 });

  const first = text(body.first_name, 100);
  const last = text(body.last_name, 100);
  const email = text(body.email, 200).toLowerCase();
  if (!first || !last) return NextResponse.json({ error: 'Please enter your first and last name.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please check your email address.' }, { status: 400 });
  }
  const type = TYPES.includes(body.registrant_type) ? body.registrant_type : 'Attendee';

  const supabase = createServerSupabaseClient();
  // Events that track payment (AMO file had Balance Due): walk-ins owe until the desk records it.
  const { count } = await supabase
    .from('cert_registrants')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', s.course.id)
    .not('payment_status', 'is', null);

  const row = {
    id: randomUUID(),
    course_id: s.course.id,
    first_name: first,
    last_name: last,
    email,
    title: text(body.title, 150) || null,
    registrant_type: type,
    township: text(body.township, 100).replace(/\s+township\s*$/i, '') || null,
    county: text(body.county, 100).replace(/\s+county\s*$/i, '') || null,
    organization: text(body.organization, 150) || null,
    badge_token: generateBadgeToken(),
    is_walk_in: true,
    payment_status: count ? 'due' : null,
    self_registered_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('cert_registrants').insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await assignWalkInNumbers(supabase, s.course.id);
  return NextResponse.json({ ok: true, first_name: first });
}
