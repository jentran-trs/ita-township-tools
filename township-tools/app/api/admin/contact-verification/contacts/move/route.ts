import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';
import { isAdmin } from '../../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST — move one or more contacts to a different township.
// Body: { contactIds: string[], target_township_id: string }
// Updates cv_contacts.township_id and writes one audit-log row per contact
// recording the previous and new township for traceability.
export async function POST(req: Request) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = requireSuperadmin();
  if (sErr) return sErr;

  const body = await req.json().catch(() => ({}));
  const contactIds: string[] = Array.isArray(body?.contactIds) ? body.contactIds : [];
  const targetTownshipId: string = (body?.target_township_id || '').toString();
  if (contactIds.length === 0 || !targetTownshipId) {
    return NextResponse.json(
      { error: 'contactIds and target_township_id are required' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  // Verify the target township exists
  const { data: target } = await supabase
    .from('cv_townships')
    .select('id, name, cv_counties:county_id ( name, cv_regions:region_id ( name ) )')
    .eq('id', targetTownshipId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: 'Target township not found' }, { status: 404 });

  // Snapshot existing rows so we can audit per-contact
  const { data: existing } = await supabase
    .from('cv_contacts')
    .select(
      `id, township_id, first_name, last_name, email,
       cv_townships:township_id ( name, cv_counties:county_id ( name, cv_regions:region_id ( name ) ) )`
    )
    .in('id', contactIds);

  // Update contacts in one go
  const { error: updateErr } = await supabase
    .from('cv_contacts')
    .update({ township_id: targetTownshipId })
    .in('id', contactIds);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Audit-log per contact
  const auditRows = (existing || []).map((c: any) => ({
    township_id: targetTownshipId,
    contact_id: c.id,
    action: 'admin_move',
    before: {
      township_id: c.township_id,
      township_name: c.cv_townships?.name,
      county_name: c.cv_townships?.cv_counties?.name,
      region_name: c.cv_townships?.cv_counties?.cv_regions?.name,
    },
    after: {
      township_id: targetTownshipId,
      township_name: (target as any).name,
      county_name: (target as any).cv_counties?.name,
      region_name: (target as any).cv_counties?.cv_regions?.name,
    },
  }));
  if (auditRows.length) {
    await supabase.from('cv_audit_log').insert(auditRows);
  }

  return NextResponse.json({ ok: true, moved: contactIds.length });
}
