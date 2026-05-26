import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { credentialId: string } };

// POST — fire-and-forget bump of last_downloaded_at. Public route.
export async function POST(_req: Request, { params }: RouteParams) {
  const supabase = createServerSupabaseClient();
  await supabase
    .from('certificates')
    .update({ last_downloaded_at: new Date().toISOString() })
    .eq('credential_id', params.credentialId);
  return NextResponse.json({ ok: true });
}
