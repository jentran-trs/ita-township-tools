import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../../lib/supabase';
import { isAdmin } from '../../../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { scope: string; id: string } }
) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = requireSuperadmin(); if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { scope, id } = params;

  let townshipIds: string[] = [];
  if (scope === 'township') {
    townshipIds = [id];
  } else if (scope === 'county') {
    const { data } = await supabase.from('cv_townships').select('id').eq('county_id', id);
    townshipIds = (data || []).map((t: any) => t.id);
  } else if (scope === 'region') {
    const { data: cs } = await supabase.from('cv_counties').select('id').eq('region_id', id);
    const cIds = (cs || []).map((c: any) => c.id);
    const { data: ts } = await supabase.from('cv_townships').select('id').in('county_id', cIds);
    townshipIds = (ts || []).map((t: any) => t.id);
  } else {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  }

  if (townshipIds.length === 0) return NextResponse.json({ contacts: [] });

  const { data, error } = await supabase
    .from('cv_contacts')
    .select(
      `id, first_name, last_name, title, email, phone, email_status,
       previous_email, previous_email_status,
       review_status, reviewed_at, reviewed_by_name,
       amo_updated_at, amo_updated_by,
       cv_townships:township_id ( id, name,
         cv_counties:county_id ( id, name, cv_regions:region_id ( id, name ) )
       )`
    )
    .in('township_id', townshipIds)
    .is('deleted_at', null)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contacts = (data || []).map((c: any) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    title: c.title,
    email: c.email,
    phone: c.phone,
    email_status: c.email_status,
    previous_email: c.previous_email,
    previous_email_status: c.previous_email_status,
    review_status: c.review_status,
    reviewed_by_name: c.reviewed_by_name,
    reviewed_at: c.reviewed_at,
    amo_updated_at: c.amo_updated_at,
    amo_updated_by: c.amo_updated_by,
    region_name: c.cv_townships?.cv_counties?.cv_regions?.name || '',
    county_name: c.cv_townships?.cv_counties?.name || '',
    township_name: c.cv_townships?.name || '',
    township_id: c.cv_townships?.id || '',
  }));

  return NextResponse.json({ contacts });
}
