import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { corsPreflight, withCors } from '@/lib/merger-map/cors';
import { DEFAULT_SETTINGS } from '@/lib/merger-map/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return corsPreflight();
}

// GET — public. Everything the ITA-site map needs: { meetings, settings }.
export async function GET() {
  const supabase = createServerSupabaseClient();
  const [m, s] = await Promise.all([
    supabase
      .from('merger_map_counties')
      .select('county, status, contact_name, meeting_date, meeting_time, location, notes'),
    supabase
      .from('merger_map_settings')
      .select('title, intro, contact_name, contact_email, contact_phone')
      .eq('id', 1)
      .maybeSingle(),
  ]);
  if (m.error) {
    return withCors(NextResponse.json({ error: 'Could not load meetings' }, { status: 500 }));
  }
  const res = NextResponse.json({
    meetings: m.data ?? [],
    settings: { ...DEFAULT_SETTINGS, ...(s.data ?? {}) },
  });
  res.headers.set('Cache-Control', 'no-store');
  return withCors(res);
}
