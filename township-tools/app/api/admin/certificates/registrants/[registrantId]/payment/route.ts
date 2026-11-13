import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { adminName } from '@/lib/badges/admin-name';
import { markRegistrantPaid } from '@/lib/badges/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { registrantId: string } };

// POST { method: 'check' | 'card' | 'admin' }
// Jen records a payment (e.g. after matching it in AMO). Any certificate held
// for payment becomes downloadable immediately.
export async function POST(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!['check', 'card', 'admin'].includes(b.method)) {
    return NextResponse.json({ error: 'method must be check, card or admin' }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { data: reg } = await supabase
    .from('cert_registrants')
    .select('id, course_id')
    .eq('id', params.registrantId)
    .maybeSingle();
  if (!reg) return NextResponse.json({ error: 'Registrant not found' }, { status: 404 });

  const { error } = await supabase.from('cert_payments').insert({
    course_id: reg.course_id,
    registrant_id: reg.id,
    method: b.method,
    recorded_by: await adminName(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await markRegistrantPaid(reg.id, b.method);
  return NextResponse.json({ ok: true });
}

// DELETE — undo a payment recorded by mistake: the person owes again and any
// issued certificate goes back on hold. Payment rows are voided, not deleted.
export async function DELETE(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const supabase = createServerSupabaseClient();
  const { data: reg } = await supabase
    .from('cert_registrants')
    .select('id, certificate_id')
    .eq('id', params.registrantId)
    .maybeSingle();
  if (!reg) return NextResponse.json({ error: 'Registrant not found' }, { status: 404 });
  await supabase.from('cert_payments').update({ voided_at: new Date().toISOString() }).eq('registrant_id', reg.id).is('voided_at', null);
  const { error } = await supabase.from('cert_registrants').update({ payment_status: 'due', payment_method: null }).eq('id', reg.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (reg.certificate_id) await supabase.from('certificates').update({ payment_hold: true }).eq('id', reg.certificate_id);
  return NextResponse.json({ ok: true });
}
