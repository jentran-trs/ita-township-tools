import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { townshipId: string } }
) {
  const supabase = createServerSupabaseClient();

  const { data: township, error: tErr } = await supabase
    .from('cv_townships')
    .select(
      `id, name, slug, street_address, mailing_address, status, completed_at, completed_by_name, completed_by_email,
       address_status, address_reviewed_at, address_reviewed_by_name,
       cv_counties:county_id ( id, name, slug, cv_regions:region_id ( id, name, slug ) )`
    )
    .eq('id', params.townshipId)
    .maybeSingle();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!township) return NextResponse.json({ error: 'Township not found' }, { status: 404 });

  const { data: contacts, error: cErr } = await supabase
    .from('cv_contacts')
    .select('id, first_name, last_name, title, email, phone, email_status, previous_email, previous_email_status, review_status, reviewed_at, reviewed_by_name, updated_at')
    .eq('township_id', params.townshipId)
    .is('deleted_at', null)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  return NextResponse.json({ township, contacts });
}
