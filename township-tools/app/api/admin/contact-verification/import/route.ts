import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { isAdmin } from '../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';
import { parseRegionWorkbook, slugify } from '../../../../../lib/contact-verification/xlsx';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ParsedContact = {
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  email_status: string | null;
};

type ParsedTownship = {
  name: string;
  slug: string;
  street_address: string | null;
  mailing_address: string | null;
  contacts: ParsedContact[];
};

type ParsedCounty = {
  name: string;
  slug: string;
  townships: ParsedTownship[];
};

function contactKey(c: { email: string | null; first_name: string | null; last_name: string | null; title: string | null }) {
  if (c.email) return `e:${c.email.toLowerCase().trim()}`;
  return `n:${(c.first_name || '').toLowerCase().trim()}|${(c.last_name || '').toLowerCase().trim()}|${(c.title || '').toLowerCase().trim()}`;
}

export async function POST(req: Request) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = await requireSuperadmin(); if (sErr) return sErr;

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const regionName = (formData.get('regionName') as string | null)?.trim();
  const dryRun = formData.get('dryRun') === 'true';

  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  if (!regionName) return NextResponse.json({ error: 'regionName is required' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed: { counties: ParsedCounty[] };
  try {
    parsed = await parseRegionWorkbook(buffer);
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to parse: ${err.message}` }, { status: 400 });
  }

  const summary = {
    region: regionName,
    counties: parsed.counties.length,
    townships: parsed.counties.reduce((s, c) => s + c.townships.length, 0),
    contacts: parsed.counties.reduce(
      (s, c) => s + c.townships.reduce((s2, t) => s2 + t.contacts.length, 0),
      0
    ),
    counties_detail: parsed.counties.map((c) => ({
      name: c.name,
      townships: c.townships.length,
      contacts: c.townships.reduce((s, t) => s + t.contacts.length, 0),
    })),
  };

  if (dryRun) return NextResponse.json({ ok: true, dryRun: true, summary });

  const supabase = createServerSupabaseClient();
  const regionSlug = slugify(regionName);

  // upsert region
  const { data: regionRow, error: regionErr } = await supabase
    .from('cv_regions')
    .upsert({ name: regionName, slug: regionSlug }, { onConflict: 'slug' })
    .select()
    .single();
  if (regionErr) return NextResponse.json({ error: regionErr.message }, { status: 500 });

  let upsertedCounties = 0;
  let upsertedTownships = 0;
  let insertedContacts = 0;
  let skippedExistingContacts = 0;

  for (const county of parsed.counties) {
    const { data: countyRow, error: countyErr } = await supabase
      .from('cv_counties')
      .upsert(
        { region_id: regionRow.id, name: county.name, slug: county.slug },
        { onConflict: 'region_id,slug' }
      )
      .select()
      .single();
    if (countyErr) return NextResponse.json({ error: countyErr.message }, { status: 500 });
    upsertedCounties += 1;

    for (const township of county.townships) {
      const { data: existingTownship } = await supabase
        .from('cv_townships')
        .select('id, street_address, mailing_address')
        .eq('county_id', countyRow.id)
        .eq('slug', township.slug)
        .maybeSingle();

      let townshipId: string;
      if (existingTownship) {
        townshipId = existingTownship.id;
        const patch: Record<string, any> = {};
        if (!existingTownship.street_address && township.street_address) patch.street_address = township.street_address;
        if (!existingTownship.mailing_address && township.mailing_address) patch.mailing_address = township.mailing_address;
        if (Object.keys(patch).length) await supabase.from('cv_townships').update(patch).eq('id', townshipId);
      } else {
        const { data: newTownship, error: tErr } = await supabase
          .from('cv_townships')
          .insert({
            county_id: countyRow.id,
            name: township.name,
            slug: township.slug,
            street_address: township.street_address,
            mailing_address: township.mailing_address,
          })
          .select('id')
          .single();
        if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
        townshipId = newTownship.id;
      }
      upsertedTownships += 1;

      const { data: existingContacts } = await supabase
        .from('cv_contacts')
        .select('id, first_name, last_name, title, email, review_status')
        .eq('township_id', townshipId);

      const existingByKey = new Map<string, { id: string; review_status: string }>();
      for (const c of existingContacts || []) {
        existingByKey.set(contactKey(c as any), { id: c.id, review_status: c.review_status });
      }

      const toInsert: any[] = [];
      for (const contact of township.contacts) {
        const key = contactKey(contact);
        const existing = existingByKey.get(key);
        if (existing) {
          skippedExistingContacts += 1;
          continue;
        }
        toInsert.push({
          township_id: townshipId,
          first_name: contact.first_name,
          last_name: contact.last_name,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          email_status: contact.email_status,
          review_status: 'unreviewed',
        });
      }
      if (toInsert.length) {
        const { error: insErr } = await supabase.from('cv_contacts').insert(toInsert);
        if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
        insertedContacts += toInsert.length;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    summary,
    written: { upsertedCounties, upsertedTownships, insertedContacts, skippedExistingContacts },
  });
}
