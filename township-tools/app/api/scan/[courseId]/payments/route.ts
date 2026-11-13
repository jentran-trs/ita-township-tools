import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireScanSession } from '@/lib/badges/scan-session';
import { CHECK_PHOTO_BUCKET, markRegistrantPaid } from '@/lib/badges/payments';
import { readCheckPhoto } from '@/lib/badges/check-reader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

// POST multipart/form-data — one payment taken at the door.
//   meta   JSON { client_payment_id, registrant_id, method: 'check'|'card',
//                 check_number?, amount?, recorded_at, device_label? }
//   photo  image/jpeg (checks only, optional)
// Safe to resend: a repeat client_payment_id is acknowledged and ignored.
export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  const s = await requireScanSession(params.courseId);
  if (s.error) return s.error;
  const { course } = s;

  const form = await req.formData();
  let meta: any;
  try {
    meta = JSON.parse(String(form.get('meta') || ''));
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

  let photoPath: string | null = null;
  let photoBytes: Buffer | null = null;
  const photo = form.get('photo');
  if (photo && typeof photo !== 'string' && meta.method === 'check') {
    if (photo.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: 'Photo too large', rejected: true }, { status: 413 });
    photoBytes = Buffer.from(await photo.arrayBuffer());
    photoPath = `${course.id}/${reg.id}/${clientId.replace(/[^A-Za-z0-9-]/g, '')}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(CHECK_PHOTO_BUCKET)
      .upload(photoPath, photoBytes, { contentType: 'image/jpeg', upsert: true });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const amount = meta.amount === '' || meta.amount == null ? null : Number(meta.amount);
  const recordedAt = new Date(meta.recorded_at);
  const { data: inserted, error } = await supabase
    .from('cert_payments')
    .insert({
      course_id: course.id,
      registrant_id: reg.id,
      client_payment_id: clientId,
      method: meta.method,
      check_number: String(meta.check_number || '').trim().slice(0, 40) || null,
      amount: amount != null && Number.isFinite(amount) ? amount : null,
      photo_path: photoPath,
      recorded_by: String(meta.device_label || '').slice(0, 80) || 'Check-in team',
      recorded_at: isNaN(recordedAt.getTime()) ? new Date().toISOString() : recordedAt.toISOString(),
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await markRegistrantPaid(reg.id, meta.method);

  // Read the check number / amount / payer from the photo for Jen to confirm.
  // Best effort: never fails the upload.
  if (photoBytes && inserted) {
    try {
      const found = await readCheckPhoto(photoBytes);
      if (found) {
        await supabase
          .from('cert_payments')
          .update({
            detected_check_number: found.check_number,
            detected_amount: found.amount,
            detected_payer: found.payer,
          })
          .eq('id', inserted.id);
      }
    } catch {}
  }
  return NextResponse.json({ ok: true });
}
