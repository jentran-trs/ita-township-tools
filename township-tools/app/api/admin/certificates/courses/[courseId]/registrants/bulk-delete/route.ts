import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { ids: string[] } — remove several registrants from this course at once,
// along with their check-in/out records. People who already have a
// certificate issued from attendance are skipped (revoke on the Attendees tab).
export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  let ids: string[] = [];
  try {
    const body = await req.json();
    ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 2000) : [];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!ids.length) return NextResponse.json({ error: 'No registrants selected' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: rows, error } = await supabase
    .from('cert_registrants')
    .select('id, first_name, last_name, certificate_id')
    .eq('course_id', params.courseId)
    .in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const deletable = (rows || []).filter((r: any) => !r.certificate_id).map((r: any) => r.id);
  const skipped = (rows || []).filter((r: any) => r.certificate_id).map((r: any) => `${r.first_name} ${r.last_name}`);

  if (deletable.length) {
    // Scans go with them (ON DELETE CASCADE).
    const { error: delErr } = await supabase
      .from('cert_registrants')
      .delete()
      .eq('course_id', params.courseId)
      .in('id', deletable);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: deletable.length, skipped });
}
