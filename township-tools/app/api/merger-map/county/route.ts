import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireMapEditor } from '@/lib/merger-map/auth';
import { INDIANA_COUNTIES } from '@/lib/merger-map/indiana-counties';
import { corsPreflight, withCors } from '@/lib/merger-map/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return corsPreflight();
}

const COUNTY_NAMES = new Set(INDIANA_COUNTIES.map((c) => c.name));

function text(v: unknown, max = 500): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

// PUT — passcode. Body: { county, status: 'scheduled' | 'pending' | 'none', ... }.
// status 'none' clears the county back to "no activity".
export async function PUT(req: Request) {
  const authErr = await requireMapEditor(req);
  if (authErr) return withCors(authErr);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return withCors(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }));
  }

  const county = typeof body?.county === 'string' ? body.county : '';
  if (!COUNTY_NAMES.has(county)) {
    return withCors(NextResponse.json({ error: 'Unknown county' }, { status: 400 }));
  }

  const supabase = createServerSupabaseClient();
  const status = body?.status;

  if (status === 'none') {
    const { error } = await supabase.from('merger_map_counties').delete().eq('county', county);
    if (error) return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
    return withCors(NextResponse.json({ ok: true, meeting: null }));
  }

  if (status !== 'scheduled' && status !== 'pending') {
    return withCors(NextResponse.json({ error: 'Invalid status' }, { status: 400 }));
  }

  const date = text(body?.meeting_date, 10);
  const time = text(body?.meeting_time, 8);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return withCors(NextResponse.json({ error: 'Invalid date' }, { status: 400 }));
  }
  if (time && !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    return withCors(NextResponse.json({ error: 'Invalid time' }, { status: 400 }));
  }

  const row = {
    county,
    status,
    contact_name: text(body?.contact_name, 200),
    contact_email: text(body?.contact_email, 200),
    meeting_date: status === 'scheduled' ? date : null,
    meeting_time: status === 'scheduled' ? time : null,
    location: text(body?.location, 300),
    notes: text(body?.notes, 1000),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('merger_map_counties')
    .upsert(row, { onConflict: 'county' })
    .select('*')
    .single();
  if (error) return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
  return withCors(NextResponse.json({ ok: true, meeting: data }));
}
