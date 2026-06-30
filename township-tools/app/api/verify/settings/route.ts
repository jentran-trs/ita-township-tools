import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase';
import { isPortalLocked, getPortalLockBounds } from '../../../../lib/contact-verification/portal-lock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('cv_settings')
    .select('verification_deadline, portal_status_override')
    .eq('id', 1)
    .maybeSingle();
  const deadline = data?.verification_deadline || null;
  const override = data?.portal_status_override || 'auto';
  const { closeStart, reopen } = getPortalLockBounds(deadline);
  return NextResponse.json({
    verification_deadline: deadline,
    portal_status_override: override,
    portal_locked: isPortalLocked(deadline, override),
    // True only for a manual close, so the public banner can show the "use ITA
    // Member Center" message instead of the deadline/reopen finalization copy.
    portal_manually_closed: override === 'closed',
    portal_close_start: closeStart,
    portal_reopen: reopen,
  });
}
