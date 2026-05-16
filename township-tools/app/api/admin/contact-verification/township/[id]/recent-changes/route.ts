import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../../lib/supabase';
import { isAdmin } from '../../../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../../../lib/auth/superadmin';
import { getRecentChangesCutoff } from '../../../../../../../lib/contact-verification/cutoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — return contact IDs in this township that have changed since the admin's last visit.
// Used by the public township page to highlight rows when superadmin is viewing.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const [{ data: viewRow }, { data: settings }, { data: seenRows }] = await Promise.all([
    supabase
      .from('cv_admin_views')
      .select('last_viewed_at')
      .eq('admin_user_id', authData.userId)
      .maybeSingle(),
    supabase.from('cv_settings').select('verification_deadline').eq('id', 1).maybeSingle(),
    supabase
      .from('cv_admin_seen_contacts')
      .select('contact_id, seen_at')
      .eq('admin_user_id', authData.userId),
  ]);

  const { cutoff, suppress } = getRecentChangesCutoff(
    settings?.verification_deadline || null,
    viewRow?.last_viewed_at || null
  );
  if (suppress) {
    return NextResponse.json({ contactIds: [], total: 0 });
  }
  const seenMap = new Map<string, string>();
  for (const r of seenRows || []) seenMap.set(r.contact_id, r.seen_at);

  const { data, error } = await supabase
    .from('cv_audit_log')
    .select('contact_id, created_at, action')
    .eq('township_id', params.id)
    .gte('created_at', cutoff)
    .not('contact_id', 'is', null)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Distinct contact IDs that had a change after cutoff AND not yet marked seen
  const latestByContact = new Map<string, string>();
  for (const r of data || []) {
    if (!r.contact_id) continue;
    if (!latestByContact.has(r.contact_id)) latestByContact.set(r.contact_id, r.created_at);
  }
  const contactIds: string[] = [];
  latestByContact.forEach((latest, cid) => {
    const seen = seenMap.get(cid);
    if (!seen || latest > seen) contactIds.push(cid);
  });

  return NextResponse.json({
    contactIds,
    total: contactIds.length,
  });
}
