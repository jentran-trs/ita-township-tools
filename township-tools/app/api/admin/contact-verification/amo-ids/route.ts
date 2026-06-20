import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';
import { parseAmoWorkbook, matchContacts, type CvContact } from '../../../../../lib/contact-verification/amo-match';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST  multipart/form-data
//   file   File      AMO Individual Report (.xlsx)
//   mode   'preview' | 'commit'
// Assigns cv_contacts.amo_individual_id by matching the AMO export. Commit only
// writes contacts whose ID actually changes.
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

  let amo;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    amo = await parseAmoWorkbook(buffer);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to read file' }, { status: 400 });
  }
  if (!amo.length) {
    return NextResponse.json({ error: 'No rows with an AMO Individual ID were found.' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Page through all active contacts.
  const contacts: CvContact[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('cv_contacts')
      .select('id, first_name, last_name, email, amo_individual_id, cv_townships:township_id ( name, cv_counties:county_id ( name ) )')
      .is('deleted_at', null)
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const c of data as any[]) {
      contacts.push({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        amo_individual_id: c.amo_individual_id,
        township: c.cv_townships?.name,
        county: c.cv_townships?.cv_counties?.name,
      });
    }
    if (!data || data.length < 1000) break;
    from += 1000;
  }

  const result = matchContacts(amo, contacts);
  const changes = result.matches.filter((m) => (m.current ?? '') !== m.amoId);

  const summary = {
    amo_rows: amo.length,
    contacts: contacts.length,
    matched: result.matches.length,
    will_update: changes.length,
    already_set: result.matches.length - changes.length,
    ambiguous: result.ambiguous,
    unmatched: result.unmatched,
    by_email: result.counts.email,
    by_email_name: result.counts.emailName,
    by_name_org: result.counts.nameOrg,
  };

  if (mode === 'preview') {
    return NextResponse.json({ ok: true, mode: 'preview', summary });
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
          .from('cv_contacts')
          .update({ amo_individual_id: m.amoId })
          .eq('id', m.contactId)
          .then((r) => (r.error ? 0 : 1))
      )
    );
    for (const r of res) (r ? updated++ : failed++);
  }

  return NextResponse.json({ ok: true, mode: 'commit', summary, updated_count: updated, failed_count: failed });
}
