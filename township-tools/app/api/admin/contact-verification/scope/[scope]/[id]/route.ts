import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../../lib/supabase';
import { isAdmin } from '../../../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';

type Scope = 'region' | 'county' | 'township';

export async function GET(
  _req: Request,
  { params }: { params: { scope: string; id: string } }
) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin(); if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const scope = params.scope as Scope;
  const id = params.id;

  let stats;
  if (scope === 'region') {
    const r = await supabase.from('cv_completion_stats').select('*').eq('region_id', id);
    stats = r.data;
  } else if (scope === 'county') {
    const r = await supabase.from('cv_completion_stats').select('*').eq('county_id', id);
    stats = r.data;
  } else if (scope === 'township') {
    const r = await supabase.from('cv_completion_stats').select('*').eq('township_id', id);
    stats = r.data;
  } else {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  }

  // Attach slugs so the UI can deep-link to the public /verify page
  const townshipIds = (stats || []).map((s: any) => s.township_id);
  if (townshipIds.length) {
    const { data: tRows } = await supabase
      .from('cv_townships')
      .select('id, slug, county_id, cv_counties:county_id ( slug, region_id, cv_regions:region_id ( slug ) )')
      .in('id', townshipIds);
    const slugMap = new Map<string, any>();
    for (const t of tRows || []) {
      slugMap.set(t.id, {
        township_slug: t.slug,
        county_slug: (t as any).cv_counties?.slug,
        region_slug: (t as any).cv_counties?.cv_regions?.slug,
      });
    }
    stats = (stats || []).map((s: any) => ({ ...s, ...(slugMap.get(s.township_id) || {}) }));
  }

  // Recent edits for this scope
  let auditQuery = supabase
    .from('cv_audit_log')
    .select(
      `id, action, created_at, reviewer_name, reviewer_email, township_id, contact_id, before, after,
       cv_townships:township_id ( name, cv_counties:county_id ( name ) )`
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (scope === 'township') {
    auditQuery = auditQuery.eq('township_id', id);
  } else {
    const townshipIds = (stats || []).map((s: any) => s.township_id);
    if (townshipIds.length === 0) return NextResponse.json({ stats: stats || [], audit: [] });
    auditQuery = auditQuery.in('township_id', townshipIds);
  }

  const { data: audit, error: auditErr } = await auditQuery;
  if (auditErr) return NextResponse.json({ error: auditErr.message }, { status: 500 });

  // Pull deadline + this admin's last viewed time so the UI can label rows as "new"
  const [{ data: settings }, { data: viewRow }] = await Promise.all([
    supabase.from('cv_settings').select('verification_deadline').eq('id', 1).maybeSingle(),
    supabase
      .from('cv_admin_views')
      .select('last_viewed_at')
      .eq('admin_user_id', authData.userId)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    stats: stats || [],
    audit: audit || [],
    last_viewed_at: viewRow?.last_viewed_at || null,
    verification_deadline: settings?.verification_deadline || null,
  });
}
