import { adminName } from '@/lib/badges/admin-name';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { generateBadgeToken } from '@/lib/badges/token';
import { recipientKey } from '@/lib/certificates/xlsx-import';
import { substitutePatch, syncCertificate, undoSubstitutePatch } from '@/lib/badges/registrant-edit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { registrantId: string } };

// PATCH — { action: 'cancel_badge' } issues a new QR code so a lost badge
// stops working (reprint afterwards). Or { day_hours: {"YYYY-MM-DD": n} | null }
// to record partial-credit hours. Or edit details: first_name, last_name,
// email, title, registrant_type, organization, township, county (hand edits
// are kept by later AMO imports, and copied to an issued certificate).
// substitute: true = someone else attends on this registration (the original
// registrant is kept in substituted_for); undo_substitute: true puts them back.
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
  // Registration cancelled (e.g. the day before), or back on (v45).
  if (body.action === 'cancel_registration') {
    patch.cancelled_at = new Date().toISOString();
    patch.cancelled_by = 'Admin';
    patch.cancel_note = String(body.note || '').trim().slice(0, 500) || null;
  }
  // Needs review → accepted by the office (v47), or back to needs review.
  if (body.action === 'mark_reviewed') {
    patch.reviewed_at = new Date().toISOString();
    patch.reviewed_by = await adminName();
    patch.review_note = String(body.note || '').trim().slice(0, 500) || null;
  }
  if (body.action === 'unmark_reviewed') {
    patch.reviewed_at = null;
    patch.reviewed_by = null;
    patch.review_note = null;
  }
  if (body.action === 'restore_registration') {
    patch.cancelled_at = null;
    patch.cancelled_by = null;
    patch.cancel_note = null;
  }

  if ('email' in body) {
    const email = String(body.email || '').trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'That email address does not look right' }, { status: 400 });
    }
    patch.email = email;
  }

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

  // Details edited by hand.
  const text = (v: any, max: number) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
  for (const k of ['first_name', 'last_name'] as const) {
    if (k in body) {
      const v = text(body[k], 100);
      if (!v) return NextResponse.json({ error: 'First and last name are required' }, { status: 400 });
      patch[k] = v;
    }
  }
  if ('title' in body) patch.title = text(body.title, 150) || null;
  if ('registrant_type' in body) patch.registrant_type = text(body.registrant_type, 50) || null;
  if ('organization' in body) patch.organization = text(body.organization, 150) || null;
  // Stored bare ("Oregon", "Allen"); "Township"/"County" are added for display.
  if ('township' in body) patch.township = text(body.township, 100).replace(/\s+township\s*$/i, '') || null;
  if ('county' in body) patch.county = text(body.county, 100).replace(/\s+county\s*$/i, '') || null;
  const DETAILS = ['first_name', 'last_name', 'email', 'title', 'registrant_type', 'organization', 'township', 'county'];
  const substitute = body.substitute === true;
  const undoSubstitute = body.undo_substitute === true;
  const editsDetails = DETAILS.some((k) => k in patch) || substitute || undoSubstitute;

  if (!Object.keys(patch).length && !undoSubstitute) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  let certificateId: string | null = null;
  if (editsDetails) {
    const { data: cur } = await supabase
      .from('cert_registrants')
      .select('*')
      .eq('id', params.registrantId)
      .maybeSingle();
    if (!cur) return NextResponse.json({ error: 'Registrant not found' }, { status: 404 });
    if (undoSubstitute) {
      const back = undoSubstitutePatch(cur);
      if (!back) return NextResponse.json({ error: 'Nobody is attending in their place' }, { status: 400 });
      Object.keys(patch).forEach((k) => delete patch[k]);
      Object.assign(patch, back);
    } else if (substitute) {
      const same =
        String(patch.first_name ?? cur.first_name).toLowerCase() === String(cur.first_name).toLowerCase() &&
        String(patch.last_name ?? cur.last_name).toLowerCase() === String(cur.last_name).toLowerCase();
      if (same) return NextResponse.json({ error: "Enter the name of the person who's attending instead" }, { status: 400 });
      if (!(patch.email ?? cur.email)) return NextResponse.json({ error: 'Email is required, so they can get their certificate' }, { status: 400 });
      Object.assign(patch, substitutePatch(cur, 'Admin'));
    }
    patch.edited_at = new Date().toISOString();
    // Remember how AMO knew them, so the next import still matches after a name/email fix.
    if (!cur.original_key && !cur.is_walk_in) patch.original_key = recipientKey(cur.email, cur.first_name, cur.last_name);
    certificateId = cur.certificate_id || null;
  }
  const { data, error } = await supabase
    .from('cert_registrants')
    .update(patch)
    .eq('id', params.registrantId)
    .select('id, badge_token, day_hours')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Registrant not found' }, { status: 404 });

  // Keep an issued certificate in step with the corrected details.
  await syncCertificate(supabase, certificateId, patch);
  return NextResponse.json({ ok: true, registrant: data, certificate_updated: !!certificateId });
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
