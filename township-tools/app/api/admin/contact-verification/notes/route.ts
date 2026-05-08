import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { isAdmin } from '../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — list every session_finished audit row that has a handoff note,
// joined with region/county/township for context.
export async function GET() {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cv_audit_log')
    .select(
      `id, created_at, reviewer_name, reviewer_email, after, township_id,
       cv_townships:township_id ( name,
         cv_counties:county_id ( name, cv_regions:region_id ( name ) )
       )`
    )
    .eq('action', 'session_finished')
    .not('after->note', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notes = (data || [])
    .filter((r: any) => r.after?.note)
    .map((r: any) => ({
      id: r.id,
      created_at: r.created_at,
      reviewer_name: r.reviewer_name,
      reviewer_email: r.reviewer_email,
      note: r.after?.note,
      township_id: r.township_id,
      township_name: r.cv_townships?.name || '',
      county_name: r.cv_townships?.cv_counties?.name || '',
      region_name: r.cv_townships?.cv_counties?.cv_regions?.name || '',
    }));

  return NextResponse.json({ notes });
}
