import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireScanSession } from '@/lib/badges/scan-session';
import { easternDate } from '@/lib/badges/attendance';
import { isBadgeToken } from '@/lib/badges/token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type WalkIn = {
  id: string; // generated on the phone so offline scans can reference it
  badge_token: string; // generated on the phone, same format as server tokens
  first_name: string;
  last_name: string;
  email?: string;
  organization?: string;
  title?: string;
  registrant_type?: string;
  township?: string;
  county?: string;
};

type Scan = {
  client_scan_id: string;
  registrant_id: string;
  direction: 'in' | 'out';
  scanned_at: string;
  source?: 'scan' | 'name_search';
  device_label?: string;
};

// POST { walk_ins: WalkIn[], scans: Scan[] } — upload what the phone recorded.
// Safe to resend: walk-ins upsert by id and scans by client_scan_id, so a
// retry after a dropped connection never double-counts.
export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  const s = await requireScanSession(params.courseId);
  if (s.error) return s.error;
  const { course } = s;

  let body: { walk_ins?: WalkIn[]; scans?: Scan[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const walkIns = Array.isArray(body.walk_ins) ? body.walk_ins.slice(0, 200) : [];
  const scans = Array.isArray(body.scans) ? body.scans.slice(0, 2000) : [];
  const supabase = createServerSupabaseClient();
  const rejected: { id: string; reason: string }[] = [];

  // 1. Walk-ins first, so their scans have someone to point at.
  const walkInRows: any[] = [];
  for (const w of walkIns) {
    const first = String(w.first_name || '').trim();
    const last = String(w.last_name || '').trim();
    if (!UUID.test(w.id) || !isBadgeToken(String(w.badge_token || '')) || !first || !last) {
      rejected.push({ id: String(w.id), reason: 'Walk-in is missing a name' });
      continue;
    }
    walkInRows.push({
      id: w.id,
      course_id: course.id,
      first_name: first.slice(0, 100),
      last_name: last.slice(0, 100),
      email: String(w.email || '').trim().toLowerCase().slice(0, 200),
      title: String(w.title || '').trim().slice(0, 150) || null,
      registrant_type: String(w.registrant_type || '').trim().slice(0, 50) || null,
      township: String(w.township || '').trim().replace(/\s+township\s*$/i, '').slice(0, 100) || null,
      county: String(w.county || '').trim().replace(/\s+county\s*$/i, '').slice(0, 100) || null,
      organization: String(w.organization || '').trim().slice(0, 150) || null,
      badge_token: w.badge_token,
      is_walk_in: true,
    });
  }
  if (walkInRows.length) {
    // If this event tracks payment (the AMO file had Balance Due), a walk-in
    // owes until the door team records a payment.
    const { count } = await supabase
      .from('cert_registrants')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', course.id)
      .not('payment_status', 'is', null);
    if (count) walkInRows.forEach((w: any) => (w.payment_status = 'due'));
    const { error } = await supabase.from('cert_registrants').upsert(walkInRows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Scans — only for people registered for THIS event.
  const ids = Array.from(new Set(scans.map((x) => x.registrant_id).filter((id) => UUID.test(String(id)))));
  const known = new Set<string>();
  if (ids.length) {
    const { data } = await supabase.from('cert_registrants').select('id').eq('course_id', course.id).in('id', ids);
    (data || []).forEach((r: any) => known.add(r.id));
  }
  const scanRows = [];
  for (const x of scans) {
    const at = new Date(x.scanned_at);
    if (!x.client_scan_id || !known.has(x.registrant_id) || !['in', 'out'].includes(x.direction) || isNaN(at.getTime())) {
      rejected.push({ id: String(x.client_scan_id), reason: 'Unknown person or bad scan' });
      continue;
    }
    // Phone clocks can be off; never accept times in the future.
    const when = at.getTime() > Date.now() + 5 * 60_000 ? new Date() : at;
    scanRows.push({
      client_scan_id: String(x.client_scan_id).slice(0, 80),
      course_id: course.id,
      registrant_id: x.registrant_id,
      direction: x.direction,
      scanned_at: when.toISOString(),
      scan_date: easternDate(when),
      source: x.source === 'name_search' ? 'name_search' : 'scan',
      device_label: String(x.device_label || '').slice(0, 80) || null,
    });
  }
  if (scanRows.length) {
    const { error } = await supabase
      .from('cert_attendance_scans')
      .upsert(scanRows, { onConflict: 'client_scan_id', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    accepted_walk_ins: walkInRows.map((w) => w.id),
    accepted_scans: scanRows.map((r) => r.client_scan_id),
    rejected,
  });
}
