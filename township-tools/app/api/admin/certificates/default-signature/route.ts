import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cert_default_signature')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signature: data || null });
}

export async function PUT(req: Request) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.signer_name?.trim()) {
    return NextResponse.json({ error: 'signer_name is required' }, { status: 400 });
  }
  if (!body?.signature_image_url?.trim()) {
    return NextResponse.json({ error: 'signature_image_url is required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const row = {
    id: 1,
    signer_name: body.signer_name.trim(),
    signer_title: (body.signer_title?.trim() || 'Executive Director'),
    signature_image_url: body.signature_image_url.trim(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('cert_default_signature')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, signature: data });
}
