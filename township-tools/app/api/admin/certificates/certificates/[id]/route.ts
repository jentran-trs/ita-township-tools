import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';
import { requireSuperadmin } from '../../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { id: string } };

// PATCH — update certificate status (revoke / restore)
export async function PATCH(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch: Record<string, any> = {};
  if (typeof body.status === 'string') {
    if (!['active', 'revoked'].includes(body.status)) {
      return NextResponse.json({ error: 'status must be active or revoked' }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status === 'revoked') {
      patch.revoked_at = new Date().toISOString();
      patch.revoke_reason = typeof body.revoke_reason === 'string'
        ? body.revoke_reason.trim() || null
        : null;
    } else if (body.status === 'active') {
      // Restoring an active cert clears any prior revocation metadata.
      patch.revoked_at = null;
      patch.revoke_reason = null;
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('certificates').update(patch).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
