import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { CHECK_PHOTO_BUCKET } from '@/lib/badges/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE { payment_ids: string[] } — permanently delete several check photos
// for this course at once (e.g. after matching them in AMO). Payment records
// are kept; only the images go.
export async function DELETE(req: Request, { params }: { params: { courseId: string } }) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  let ids: string[] = [];
  try {
    const body = await req.json();
    ids = Array.isArray(body.payment_ids) ? body.payment_ids.map(String).slice(0, 1000) : [];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!ids.length) return NextResponse.json({ error: 'No photos selected' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: rows, error } = await supabase
    .from('cert_payments')
    .select('id, photo_path')
    .eq('course_id', params.courseId)
    .in('id', ids)
    .not('photo_path', 'is', null)
    .is('photo_deleted_at', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ ok: true, deleted: 0 });

  const { error: rmErr } = await supabase.storage.from(CHECK_PHOTO_BUCKET).remove(rows.map((r: any) => r.photo_path));
  if (rmErr) return NextResponse.json({ error: rmErr.message }, { status: 500 });
  await supabase
    .from('cert_payments')
    .update({ photo_deleted_at: new Date().toISOString() })
    .in('id', rows.map((r: any) => r.id));
  return NextResponse.json({ ok: true, deleted: rows.length });
}
