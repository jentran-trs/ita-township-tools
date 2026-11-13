import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireScanSession } from '@/lib/badges/scan-session';
import { markRegistrantPaid } from '@/lib/badges/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { client_payment_id, registrant_id, method: 'check' | 'card', recorded_at, device_label? }
// The door team records how someone paid. Only the method is stored — no
// check images or check/card details. Safe to resend: a repeat
// client_payment_id is acknowledged and ignored.
export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  const s = await requireScanSession(params.courseId);
  if (s.error) return s.error;
  const { course } = s;

  let meta: any;
  try {
    meta = await req.json();
  } catch {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
  }
  const clientId = String(meta.client_payment_id || '').slice(0, 80);
  if (!clientId || !['check', 'card'].includes(meta.method)) {
    return NextResponse.json({ error: 'Bad payment' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: dupe } = await supabase.from('cert_payments').select('id').eq('client_payment_id', clientId).maybeSingle();
  if (dupe) return NextResponse.json({ ok: true, duplicate: true });

  const { data: reg } = await supabase
    .from('cert_registrants')
    .select('id')
    .eq('id', String(meta.registrant_id || ''))
    .eq('course_id', course.id)
    .maybeSingle();
  if (!reg) return NextResponse.json({ error: 'Person not found for this event', rejected: true }, { status: 404 });

  const recordedAt = new Date(meta.recorded_at);
  const { error } = await supabase.from('cert_payments').insert({
    course_id: course.id,
    registrant_id: reg.id,
    client_payment_id: clientId,
    method: meta.method,
    recorded_by: String(meta.device_label || '').slice(0, 80) || 'Check-in team',
    recorded_at: isNaN(recordedAt.getTime()) ? new Date().toISOString() : recordedAt.toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await markRegistrantPaid(reg.id, meta.method);
  return NextResponse.json({ ok: true });
}
