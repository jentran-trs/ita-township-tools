import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';
import { parseOrgWorkbook, matchTownships, type CvTownship } from '../../../../../lib/contact-verification/org-amo-match';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST  multipart/form-data
//   file   File      AMO Organization Report (.xlsx)
//   mode   'preview' | 'commit'
// Assigns cv_townships.amo_organization_id by matching the AMO export on
// organization name. Commit only writes townships whose ID actually changes.
export async function POST(req: Request) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const mode = (form.get('mode') as string | null) || 'preview';
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  if (!['preview', 'commit'].includes(mode)) {
    return NextResponse.json({ error: 'mode must be preview or commit' }, { status: 400 });
  }

  let orgs;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    orgs = await parseOrgWorkbook(buffer);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to read file' }, { status: 400 });
  }
  if (!orgs.length) {
    return NextResponse.json({ error: 'No rows with an Organization AMO ID were found.' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Page through all townships.
  const townships: CvTownship[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('cv_townships')
      .select('id, name, amo_organization_id, cv_counties:county_id ( name )')
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const t of data as any[]) {
      townships.push({
        id: t.id,
        name: t.name,
        amo_organization_id: t.amo_organization_id,
        county: t.cv_counties?.name,
      });
    }
    if (!data || data.length < 1000) break;
    from += 1000;
  }

  const result = matchTownships(orgs, townships);
  const changes = result.matches.filter((m) => (m.current ?? '') !== m.amoId);

  const summary = {
    org_rows: orgs.length,
    townships: townships.length,
    matched: result.matches.length,
    will_update: changes.length,
    already_set: result.matches.length - changes.length,
    ambiguous: result.ambiguous,
    unmatched: result.unmatched,
  };

  // Townships that won't be assigned automatically — returned so the admin can
  // assign them by hand from the UI.
  const unresolved = {
    unmatched_list: result.unmatchedList,
    ambiguous_list: result.ambiguousList,
  };

  if (mode === 'preview') {
    return NextResponse.json({ ok: true, mode: 'preview', summary, ...unresolved });
  }

  // Commit: apply only the changed assignments, in concurrency-limited batches.
  let updated = 0;
  let failed = 0;
  const CHUNK = 40;
  for (let i = 0; i < changes.length; i += CHUNK) {
    const batch = changes.slice(i, i + CHUNK);
    const res = await Promise.all(
      batch.map((m) =>
        supabase
          .from('cv_townships')
          .update({ amo_organization_id: m.amoId })
          .eq('id', m.townshipId)
          .then((r) => (r.error ? 0 : 1))
      )
    );
    for (const r of res) (r ? updated++ : failed++);
  }

  return NextResponse.json({ ok: true, mode: 'commit', summary, updated_count: updated, failed_count: failed, ...unresolved });
}

// PATCH  application/json { townshipId, amoId }
// Manually set (or clear, with an empty amoId) one township's Organization AMO
// ID — used to resolve the unmatched/ambiguous rows the upload left behind.
export async function PATCH(req: Request) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const townshipId = String(body?.townshipId || '').trim();
  const amoId = String(body?.amoId ?? '').trim();
  if (!townshipId) return NextResponse.json({ error: 'townshipId is required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('cv_townships')
    .update({ amo_organization_id: amoId || null })
    .eq('id', townshipId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, townshipId, amoId: amoId || null });
}
