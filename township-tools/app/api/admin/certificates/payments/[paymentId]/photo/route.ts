import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { CHECK_PHOTO_BUCKET } from '@/lib/badges/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { paymentId: string } };

async function findPayment(id: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from('cert_payments').select('id, photo_path, photo_deleted_at').eq('id', id).maybeSingle();
  return { supabase, payment: data };
}

// GET — open the check photo. Superadmin only; redirects to a link that
// expires in 2 minutes, so the photo is never publicly reachable.
export async function GET(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const { supabase, payment } = await findPayment(params.paymentId);
  if (!payment?.photo_path || payment.photo_deleted_at) {
    return NextResponse.json({ error: 'No photo for this payment' }, { status: 404 });
  }
  const { data, error } = await supabase.storage.from(CHECK_PHOTO_BUCKET).createSignedUrl(payment.photo_path, 120);
  if (error || !data?.signedUrl) return NextResponse.json({ error: error?.message || 'Could not open photo' }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}

// DELETE — permanently remove the check photo (keeps the payment record).
export async function DELETE(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const { supabase, payment } = await findPayment(params.paymentId);
  if (!payment?.photo_path || payment.photo_deleted_at) return NextResponse.json({ ok: true });
  const { error } = await supabase.storage.from(CHECK_PHOTO_BUCKET).remove([payment.photo_path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('cert_payments').update({ photo_deleted_at: new Date().toISOString() }).eq('id', payment.id);
  return NextResponse.json({ ok: true });
}
