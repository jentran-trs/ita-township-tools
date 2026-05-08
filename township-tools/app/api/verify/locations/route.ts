import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET() {
  const supabase = createServerSupabaseClient();

  const { data: regions, error: rErr } = await supabase
    .from('cv_regions')
    .select('id, name, slug, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const { data: counties, error: cErr } = await supabase
    .from('cv_counties')
    .select('id, name, slug, region_id')
    .order('name', { ascending: true });
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const { data: townships, error: tErr } = await supabase
    .from('cv_townships')
    .select('id, name, slug, county_id, status')
    .order('name', { ascending: true });
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  const tree = (regions || []).map((r) => ({
    ...r,
    counties: (counties || [])
      .filter((c) => c.region_id === r.id)
      .map((c) => ({
        ...c,
        townships: (townships || []).filter((t) => t.county_id === c.id),
      })),
  }));

  return NextResponse.json({ regions: tree });
}
