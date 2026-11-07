import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireMapEditor } from '@/lib/merger-map/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function text(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

// PUT — passcode. Updates the title, intro and "contact for details" info.
export async function PUT(req: Request) {
  const authErr = await requireMapEditor(req);
  if (authErr) return authErr;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const row = {
    id: 1,
    title: text(body?.title, 120) ?? 'Township Merger Meetings',
    intro: text(body?.intro, 1000),
    contact_name: text(body?.contact_name, 120),
    contact_email: text(body?.contact_email, 200),
    contact_phone: text(body?.contact_phone, 40),
    updated_at: new Date().toISOString(),
  };

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('merger_map_settings')
    .upsert(row, { onConflict: 'id' })
    .select('title, intro, contact_name, contact_email, contact_phone')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, settings: data });
}
