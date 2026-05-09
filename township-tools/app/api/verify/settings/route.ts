import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase';
import { isPortalLocked, getPortalLockBounds } from '../../../../lib/contact-verification/portal-lock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('cv_settings')
    .select('verification_deadline')
    .eq('id', 1)
    .maybeSingle();
  const deadline = data?.verification_deadline || null;
  const { closeStart, reopen } = getPortalLockBounds(deadline);
  return NextResponse.json({
    verification_deadline: deadline,
    portal_locked: isPortalLocked(deadline),
    portal_close_start: closeStart,
    portal_reopen: reopen,
  });
}
