import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';
import { isAdmin } from '../../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST — bulk mark (or unmark) contacts as synced to AMO.
// Body: { contactIds: string[], synced?: boolean }  (synced defaults to true)
// Stamps cv_contacts.amo_updated_at + amo_updated_by, writes one audit row
// per contact for traceability.
export async function POST(req: Request) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const body = await req.json().catch(() => ({}));
  const contactIds: string[] = Array.isArray(body?.contactIds) ? body.contactIds : [];
  const synced = body?.synced !== false; // default true

  if (contactIds.length === 0) {
    return NextResponse.json({ error: 'contactIds required' }, { status: 400 });
  }

  let adminDisplay = 'Admin';
  let adminEmail: string | null = null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(authData.userId);
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    adminEmail = user.emailAddresses?.[0]?.emailAddress || null;
    adminDisplay = fullName || adminEmail || 'Admin';
  } catch {}

  const supabase = createServerSupabaseClient();

  // Snapshot existing AMO state per contact so the audit row shows what changed.
  const { data: existing } = await supabase
    .from('cv_contacts')
    .select('id, township_id, amo_updated_at, amo_updated_by')
    .in('id', contactIds);

  const stampedAt = new Date().toISOString();
  const update = synced
    ? { amo_updated_at: stampedAt, amo_updated_by: adminDisplay }
    : { amo_updated_at: null, amo_updated_by: null };

  const { error: upErr } = await supabase
    .from('cv_contacts')
    .update(update)
    .in('id', contactIds);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const auditRows = (existing || []).map((c: any) => ({
    township_id: c.township_id,
    contact_id: c.id,
    action: synced ? 'amo_mark_synced' : 'amo_unmark_synced',
    before: { amo_updated_at: c.amo_updated_at, amo_updated_by: c.amo_updated_by },
    after: update,
    reviewer_name: `${adminDisplay} (admin)`,
    reviewer_email: adminEmail,
  }));
  if (auditRows.length) {
    await supabase.from('cv_audit_log').insert(auditRows);
  }

  return NextResponse.json({ ok: true, count: contactIds.length, synced });
}
