import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';
import { isAdmin } from '../../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../../lib/auth/superadmin';
import { slugify } from '../../../../../../lib/contact-verification/xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PATCH — rename a township and/or reparent it to a different county
// (which implicitly changes its region, since region is derived from
// county). Body: { name?: string, county_id?: string }.
// Contacts continue to point at the same township_id, so their region/
// county follow automatically via the FK.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const body = await req.json().catch(() => ({}));
  const rawName: string | undefined = body?.name?.toString().trim();
  const rawCountyId: string | undefined = body?.county_id?.toString();

  if (rawName === undefined && rawCountyId === undefined) {
    return NextResponse.json({ error: 'Provide name and/or county_id' }, { status: 400 });
  }
  if (rawName !== undefined && rawName.length === 0) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: existing, error: exErr } = await supabase
    .from('cv_townships')
    .select(
      `id, name, slug, county_id,
       cv_counties:county_id ( id, name, slug, region_id, cv_regions:region_id ( id, name, slug ) )`
    )
    .eq('id', params.id)
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Township not found' }, { status: 404 });

  const update: Record<string, any> = {};
  const nextName = rawName !== undefined ? rawName : (existing as any).name;
  const nextCountyId = rawCountyId !== undefined ? rawCountyId : (existing as any).county_id;
  const nextSlug = slugify(nextName);
  if (!nextSlug) return NextResponse.json({ error: 'Name must contain at least one letter or number' }, { status: 400 });

  if (rawName !== undefined && rawName !== (existing as any).name) {
    update.name = rawName;
    update.slug = nextSlug;
  }
  if (rawCountyId !== undefined && rawCountyId !== (existing as any).county_id) {
    // Validate target county
    const { data: county } = await supabase
      .from('cv_counties')
      .select('id, name, slug, region_id, cv_regions:region_id ( id, name, slug )')
      .eq('id', rawCountyId)
      .maybeSingle();
    if (!county) return NextResponse.json({ error: 'Target county not found' }, { status: 404 });
    update.county_id = rawCountyId;
    // Ensure slug is set so the (county_id, slug) uniqueness check below is correct
    update.slug = nextSlug;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  // Check uniqueness of (county_id, slug) in the destination
  const { data: conflict } = await supabase
    .from('cv_townships')
    .select('id')
    .eq('county_id', nextCountyId)
    .eq('slug', nextSlug)
    .neq('id', params.id)
    .maybeSingle();
  if (conflict) {
    return NextResponse.json(
      { error: 'A township with that name already exists in the destination county.' },
      { status: 409 }
    );
  }

  update.updated_at = new Date().toISOString();

  const { data: updated, error: upErr } = await supabase
    .from('cv_townships')
    .update(update)
    .eq('id', params.id)
    .select(
      `id, name, slug, county_id,
       cv_counties:county_id ( id, name, slug, region_id, cv_regions:region_id ( id, name, slug ) )`
    )
    .single();
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const beforeCounty: any = (existing as any).cv_counties;
  const afterCounty: any = (updated as any).cv_counties;
  await supabase.from('cv_audit_log').insert({
    township_id: params.id,
    action: 'admin_edit_township',
    before: {
      name: (existing as any).name,
      slug: (existing as any).slug,
      county_id: (existing as any).county_id,
      county_name: beforeCounty?.name,
      region_name: beforeCounty?.cv_regions?.name,
    },
    after: {
      name: (updated as any).name,
      slug: (updated as any).slug,
      county_id: (updated as any).county_id,
      county_name: afterCounty?.name,
      region_name: afterCounty?.cv_regions?.name,
    },
  });

  return NextResponse.json({ ok: true, township: updated });
}
