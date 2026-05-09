import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { isAdmin } from '../../../../../lib/auth/isAdmin';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = requireSuperadmin(); if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('cv_settings').select('*').eq('id', 1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function POST(req: Request) {
  const authData = await auth();
  if (!authData?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(authData)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const sErr = requireSuperadmin(); if (sErr) return sErr;

  const body = await req.json();
  const supabase = createServerSupabaseClient();

  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if ('verification_deadline' in body) {
    update.verification_deadline = body.verification_deadline || null;
  }
  if ('digest_enabled' in body) {
    update.digest_enabled = !!body.digest_enabled;
  }
  if ('digest_recipient_email' in body) {
    update.digest_recipient_email = body.digest_recipient_email || null;
  }

  const { data, error } = await supabase
    .from('cv_settings')
    .update(update)
    .eq('id', 1)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
