import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { isAdmin } from '../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET ?q=... — superadmin-only contact search. Matches first name, last name,
// "first last" combined, and email. Returns up to 20 contacts with the
// township/county/region for context.
export async function GET(req: Request) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ contacts: [] });

  const supabase = createServerSupabaseClient();

  // Build the OR filter. For multi-word queries like "Jane Doe", also match each
  // word against first_name + last_name so the row comes back from the DB; the
  // exact "first last" pairing is enforced in the client-side filter below.
  const parts = q.split(/\s+/).filter(Boolean);
  const orParts: string[] = [];
  for (const word of parts) {
    const p = `%${word}%`;
    orParts.push(`first_name.ilike.${p}`);
    orParts.push(`last_name.ilike.${p}`);
    orParts.push(`email.ilike.${p}`);
  }

  const { data, error } = await supabase
    .from('cv_contacts')
    .select(
      `id, first_name, last_name, email, title, review_status, township_id,
       cv_townships:township_id ( id, name, slug,
         cv_counties:county_id ( name, slug, cv_regions:region_id ( name, slug ) )
       )`
    )
    .is('deleted_at', null)
    .or(orParts.join(','))
    .limit(80);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Refine client-side: every row must match the full query string against
  // first name, last name, email, OR the concatenated "first last".
  const rows = (data || []).filter((c: any) => {
    const full = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().trim();
    return (
      (c.first_name || '').toLowerCase().includes(q) ||
      (c.last_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      full.includes(q)
    );
  });

  const contacts = rows.slice(0, 20).map((c: any) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    title: c.title,
    review_status: c.review_status,
    township_id: c.township_id,
    township_name: c.cv_townships?.name || '',
    township_slug: c.cv_townships?.slug || '',
    county_name: c.cv_townships?.cv_counties?.name || '',
    county_slug: c.cv_townships?.cv_counties?.slug || '',
    region_name: c.cv_townships?.cv_counties?.cv_regions?.name || '',
    region_slug: c.cv_townships?.cv_counties?.cv_regions?.slug || '',
  }));

  return NextResponse.json({ contacts });
}
