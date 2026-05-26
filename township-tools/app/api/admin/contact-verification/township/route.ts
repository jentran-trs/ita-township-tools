import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { isAdmin } from '../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';
import { slugify } from '../../../../../lib/contact-verification/xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST — create a new township under a chosen county. Region is derived
// from the county. Body: { name: string, county_id: string }.
export async function POST(req: Request) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const body = await req.json().catch(() => ({}));
  const name: string = (body?.name || '').toString().trim();
  const countyId: string = (body?.county_id || '').toString();
  if (!name || !countyId) {
    return NextResponse.json({ error: 'name and county_id are required' }, { status: 400 });
  }
  const slug = slugify(name);
  if (!slug) return NextResponse.json({ error: 'Name must contain at least one letter or number' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { data: county } = await supabase
    .from('cv_counties')
    .select('id, name, region_id, cv_regions:region_id ( id, name )')
    .eq('id', countyId)
    .maybeSingle();
  if (!county) return NextResponse.json({ error: 'County not found' }, { status: 404 });

  const { data: conflict } = await supabase
    .from('cv_townships')
    .select('id')
    .eq('county_id', countyId)
    .eq('slug', slug)
    .maybeSingle();
  if (conflict) {
    return NextResponse.json(
      { error: 'A township with that name already exists in this county.' },
      { status: 409 }
    );
  }

  const { data: created, error: insErr } = await supabase
    .from('cv_townships')
    .insert({ county_id: countyId, name, slug })
    .select(
      `id, name, slug, county_id, status,
       cv_counties:county_id ( id, name, slug, region_id, cv_regions:region_id ( id, name, slug ) )`
    )
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  await supabase.from('cv_audit_log').insert({
    township_id: (created as any).id,
    action: 'admin_create_township',
    after: {
      name: (created as any).name,
      slug: (created as any).slug,
      county_id: (created as any).county_id,
      county_name: (county as any).name,
      region_name: (county as any).cv_regions?.name,
    },
  });

  return NextResponse.json({ ok: true, township: created });
}
