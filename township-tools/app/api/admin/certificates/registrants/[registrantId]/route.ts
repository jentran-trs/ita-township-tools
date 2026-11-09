import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { generateBadgeToken } from '@/lib/badges/token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { registrantId: string } };

// PATCH — { action: 'cancel_badge' } issues a new QR code so a lost badge
// stops working (reprint afterwards). Or { day_hours: {"YYYY-MM-DD": n} | null }
// to record partial-credit hours.
export async function PATCH(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch: Record<string, any> = {};
  if (body.action === 'cancel_badge') patch.badge_token = generateBadgeToken();

  if ('day_hours' in body) {
    const dh = body.day_hours;
    if (dh === null) {
      patch.day_hours = null;
    } else if (typeof dh === 'object' && !Array.isArray(dh)) {
      const clean: Record<string, number> = {};
      for (const [date, raw] of Object.entries(dh)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return NextResponse.json({ error: `Invalid date ${date}` }, { status: 400 });
        }
        if (raw === null || raw === '') continue;
        const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 24) {
          return NextResponse.json({ error: `Hours for ${date} must be 0–24` }, { status: 400 });
        }
        clean[date] = Math.round(n * 10) / 10;
      }
      patch.day_hours = Object.keys(clean).length ? clean : null;
    } else {
      return NextResponse.json({ error: 'day_hours must be an object or null' }, { status: 400 });
    }
  }

  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cert_registrants')
    .update(patch)
    .eq('id', params.registrantId)
    .select('id, badge_token, day_hours')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Registrant not found' }, { status: 404 });
  return NextResponse.json({ ok: true, registrant: data });
}

// DELETE — remove a registrant (and their scans). Refused once a certificate
// has been issued from their attendance.
export async function DELETE(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const supabase = createServerSupabaseClient();
  const { data: reg } = await supabase
    .from('cert_registrants')
    .select('id, certificate_id')
    .eq('id', params.registrantId)
    .maybeSingle();
  if (!reg) return NextResponse.json({ error: 'Registrant not found' }, { status: 404 });
  if (reg.certificate_id) {
    return NextResponse.json(
      { error: 'A certificate was already issued to this person; revoke it on the Attendees tab instead.' },
      { status: 409 }
    );
  }
  const { error } = await supabase.from('cert_registrants').delete().eq('id', reg.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
