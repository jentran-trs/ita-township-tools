import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('cv_settings')
    .select('verification_deadline')
    .eq('id', 1)
    .maybeSingle();
  return NextResponse.json({
    verification_deadline: data?.verification_deadline || null,
  });
}
