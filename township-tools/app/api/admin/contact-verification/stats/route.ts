import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { isAdmin } from '../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';
import { getRecentChangesCutoff } from '../../../../../lib/contact-verification/cutoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin(); if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('cv_completion_stats').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pull this admin's last viewed timestamp + the verification deadline so we can
  // tell the dashboard how many edits are "new since you last checked" and "since deadline".
  const [{ data: viewRow }, { data: settings }] = await Promise.all([
    supabase
      .from('cv_admin_views')
      .select('last_viewed_at')
      .eq('admin_user_id', authData.userId)
      .maybeSingle(),
    supabase.from('cv_settings').select('verification_deadline').eq('id', 1).maybeSingle(),
  ]);
  const lastViewedAt: string | null = viewRow?.last_viewed_at || null;
  const deadline: string | null = settings?.verification_deadline || null;
  const { cutoff: lastViewedForCompare, suppress: suppressNewPills } =
    getRecentChangesCutoff(deadline, lastViewedAt);

  // Pull audit-log entries we'll bucket per region/county/township
  let auditQuery = supabase
    .from('cv_audit_log')
    .select('township_id, created_at, action');
  const oldest = [lastViewedForCompare, deadline].filter(Boolean).sort()[0]!;
  auditQuery = auditQuery.gte('created_at', oldest);
  const { data: auditRows } = await auditQuery;

  const newSinceLastViewByTownship = new Map<string, number>();
  const newSinceDeadlineByTownship = new Map<string, number>();
  const deadlineISO = deadline ? new Date(deadline + 'T00:00:00').toISOString() : null;
  for (const row of auditRows || []) {
    if (!suppressNewPills && row.created_at > lastViewedForCompare) {
      newSinceLastViewByTownship.set(
        row.township_id,
        (newSinceLastViewByTownship.get(row.township_id) || 0) + 1
      );
    }
    if (deadlineISO && row.created_at >= deadlineISO) {
      newSinceDeadlineByTownship.set(
        row.township_id,
        (newSinceDeadlineByTownship.get(row.township_id) || 0) + 1
      );
    }
  }

  const regionMap = new Map<string, any>();
  for (const row of data || []) {
    if (!regionMap.has(row.region_id)) {
      regionMap.set(row.region_id, {
        id: row.region_id,
        name: row.region_name,
        slug: row.region_slug,
        township_total: 0,
        township_completed: 0,
        contact_total: 0,
        contact_reviewed: 0,
        new_since_last_view: 0,
        new_since_deadline: 0,
        counties: new Map<string, any>(),
      });
    }
    const region = regionMap.get(row.region_id);
    region.township_total += 1;
    if (row.township_status === 'completed') region.township_completed += 1;
    region.contact_total += row.contact_total || 0;
    region.contact_reviewed += row.contact_reviewed || 0;
    region.new_since_last_view += newSinceLastViewByTownship.get(row.township_id) || 0;
    region.new_since_deadline += newSinceDeadlineByTownship.get(row.township_id) || 0;

    if (!region.counties.has(row.county_id)) {
      region.counties.set(row.county_id, {
        id: row.county_id,
        name: row.county_name,
        slug: row.county_slug,
        township_total: 0,
        township_completed: 0,
        contact_total: 0,
        contact_reviewed: 0,
        new_since_last_view: 0,
        new_since_deadline: 0,
      });
    }
    const county = region.counties.get(row.county_id);
    county.township_total += 1;
    if (row.township_status === 'completed') county.township_completed += 1;
    county.contact_total += row.contact_total || 0;
    county.contact_reviewed += row.contact_reviewed || 0;
    county.new_since_last_view += newSinceLastViewByTownship.get(row.township_id) || 0;
    county.new_since_deadline += newSinceDeadlineByTownship.get(row.township_id) || 0;
  }

  const regions = Array.from(regionMap.values()).map((r) => ({
    ...r,
    counties: Array.from(r.counties.values()).sort((a: any, b: any) => a.name.localeCompare(b.name)),
  }));
  regions.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    regions,
    last_viewed_at: lastViewedAt,
    verification_deadline: deadline,
  });
}
