import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { isAdmin } from '../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';
import { getRecentChangesCutoff } from '../../../../../lib/contact-verification/cutoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — list every contact whose latest audit-log entry is more recent than
// the admin's per-contact "seen_at" (or, if no per-contact seen exists, more
// recent than their global last_viewed_at). Returns the contact data + last
// action so the admin can review what changed without scrolling activity logs.
export async function GET() {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = requireSuperadmin();
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

  const { cutoff, suppress, reopenISO } = getRecentChangesCutoff(
    settings?.verification_deadline || null,
    viewRow?.last_viewed_at || null
  );
  if (suppress) {
    return NextResponse.json({ changes: [], suppressed_until: reopenISO });
  }
  const seenMap = new Map<string, string>();
  for (const r of seenRows || []) seenMap.set(r.contact_id, r.seen_at);

  // All audit rows since cutoff with a non-null contact_id
  const { data: rows } = await supabase
    .from('cv_audit_log')
    .select('id, contact_id, township_id, action, created_at, reviewer_name')
    .gte('created_at', cutoff)
    .not('contact_id', 'is', null)
    .order('created_at', { ascending: false });

  // Latest audit per contact
  const latestByContact = new Map<string, any>();
  for (const r of rows || []) {
    if (!latestByContact.has(r.contact_id!)) latestByContact.set(r.contact_id!, r);
  }

  // Filter to ones not already marked seen
  const fresh = Array.from(latestByContact.values()).filter((r: any) => {
    const seenAt = seenMap.get(r.contact_id);
    return !seenAt || r.created_at > seenAt;
  });

  if (fresh.length === 0) return NextResponse.json({ changes: [] });

  // Resolve the contact rows + township/county/region context
  const contactIds = fresh.map((r: any) => r.contact_id);
  const { data: contacts } = await supabase
    .from('cv_contacts')
    .select(
      `id, first_name, last_name, title, email, phone, email_status,
       review_status, township_id,
       cv_townships:township_id ( id, name, slug,
         cv_counties:county_id ( id, name, slug, cv_regions:region_id ( id, name, slug ) )
       )`
    )
    .in('id', contactIds);
  const contactMap = new Map<string, any>();
  for (const c of contacts || []) contactMap.set(c.id, c);

  const changes = fresh
    .map((r: any) => {
      const c = contactMap.get(r.contact_id);
      if (!c) return null;
      return {
        contact_id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        title: c.title,
        email: c.email,
        phone: c.phone,
        review_status: c.review_status,
        last_action: r.action,
        last_changed_at: r.created_at,
        last_reviewer: r.reviewer_name,
        township_id: c.cv_townships?.id,
        township_name: c.cv_townships?.name || '',
        township_slug: c.cv_townships?.slug || '',
        county_name: c.cv_townships?.cv_counties?.name || '',
        county_slug: c.cv_townships?.cv_counties?.slug || '',
        region_name: c.cv_townships?.cv_counties?.cv_regions?.name || '',
        region_slug: c.cv_townships?.cv_counties?.cv_regions?.slug || '',
      };
    })
    .filter(Boolean);

  return NextResponse.json({ changes });
}
