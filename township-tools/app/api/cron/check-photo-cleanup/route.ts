import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CHECK_PHOTO_BUCKET } from '@/lib/badges/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Check photos show bank account numbers, so they're deleted 90 days after
// they were taken. The payment record (method, check number, amount, who and
// when) is kept; only the image goes.
const KEEP_DAYS = 90;

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; `?secret=` also
// works for a manual run.
function authorize(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  if (req.headers.get('authorization') === `Bearer ${expected}`) return true;
  return new URL(req.url).searchParams.get('secret') === expected;
}

export async function GET(req: Request) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerSupabaseClient();
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();

  const { data: old, error } = await supabase
    .from('cert_payments')
    .select('id, photo_path')
    .not('photo_path', 'is', null)
    .is('photo_deleted_at', null)
    .lt('recorded_at', cutoff)
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!old?.length) return NextResponse.json({ ok: true, deleted: 0 });

  const { error: rmErr } = await supabase.storage.from(CHECK_PHOTO_BUCKET).remove(old.map((p: any) => p.photo_path));
  if (rmErr) return NextResponse.json({ error: rmErr.message }, { status: 500 });
  await supabase
    .from('cert_payments')
    .update({ photo_deleted_at: new Date().toISOString() })
    .in('id', old.map((p: any) => p.id));
  return NextResponse.json({ ok: true, deleted: old.length });
}
