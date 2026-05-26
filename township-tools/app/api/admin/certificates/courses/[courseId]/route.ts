import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../lib/supabase';
import { requireSuperadmin } from '../../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { courseId: string } };

// GET — single course with signatures + attendee list
export async function GET(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();
  const { data: course, error } = await supabase
    .from('cert_courses')
    .select('*')
    .eq('id', params.courseId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [{ data: signatures }, { data: certificates }] = await Promise.all([
    supabase
      .from('cert_signatures')
      .select('*')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('certificates')
      .select(
        'id, credential_id, attendee_first, attendee_last, attendee_email, attendee_township, attendee_county, status, issued_at, last_downloaded_at'
      )
      .eq('course_id', course.id)
      .order('attendee_last', { ascending: true }),
  ]);

  return NextResponse.json({
    course,
    signatures: signatures || [],
    certificates: certificates || [],
  });
}

// PATCH — update course fields (and optionally replace signatures)
export async function PATCH(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const patch: Record<string, any> = {};
  if (typeof body.name === 'string') patch.name = body.name.trim();
  if (typeof body.course_id === 'string' && body.course_id.trim()) patch.course_id = body.course_id.trim();
  if (body.hours !== undefined) {
    const h = typeof body.hours === 'string' ? parseFloat(body.hours) : body.hours;
    if (!Number.isFinite(h) || h < 0) return NextResponse.json({ error: 'hours invalid' }, { status: 400 });
    patch.hours = h;
  }
  if (body.method !== undefined) {
    if (!['in_person', 'online', 'hybrid'].includes(body.method)) {
      return NextResponse.json({ error: 'method invalid' }, { status: 400 });
    }
    patch.method = body.method;
  }
  if (typeof body.course_date === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.course_date)) {
      return NextResponse.json({ error: 'course_date must be YYYY-MM-DD' }, { status: 400 });
    }
    patch.course_date = body.course_date;
  }
  if ('syllabus' in body) patch.syllabus = body.syllabus?.trim() || null;
  if ('syllabus_file_url' in body) {
    patch.syllabus_file_url = body.syllabus_file_url?.trim() || null;
  }
  if ('syllabus_file_name' in body) {
    patch.syllabus_file_name = body.syllabus_file_name?.trim() || null;
  }
  if (typeof body.org_name === 'string') patch.org_name = body.org_name.trim();
  if (typeof body.logo_url === 'string' && body.logo_url.trim()) patch.logo_url = body.logo_url.trim();

  if (Object.keys(patch).length) {
    const { error: updErr } = await supabase
      .from('cert_courses')
      .update(patch)
      .eq('id', params.courseId);
    if (updErr) {
      if (updErr.code === '23505') {
        return NextResponse.json({ error: `Course ID already exists` }, { status: 409 });
      }
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  }

  // Replace signatures if provided
  if (Array.isArray(body.signatures)) {
    if (body.signatures.length !== 1) {
      return NextResponse.json({ error: 'Exactly one signer is required' }, { status: 400 });
    }
    for (const s of body.signatures) {
      if (!s.signer_name?.trim() || !s.signer_title?.trim() || !s.signature_image_url?.trim()) {
        return NextResponse.json({ error: 'Every signature requires name, title, and image' }, { status: 400 });
      }
    }
    await supabase.from('cert_signatures').delete().eq('course_id', params.courseId);
    const rows = body.signatures.map((s: any, idx: number) => ({
      course_id: params.courseId,
      signer_name: s.signer_name.trim(),
      signer_title: s.signer_title.trim(),
      signature_image_url: s.signature_image_url.trim(),
      signer_organization: s.signer_organization?.trim() || null,
      display_order: typeof s.display_order === 'number' ? s.display_order : idx,
    }));
    const { error: insErr } = await supabase.from('cert_signatures').insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — delete the course and ALL of its certificates.
//
// The `certificates.course_id` FK is ON DELETE RESTRICT so deleting the
// course directly fails when any certificates exist. We perform the cascade
// in the API instead of the schema so the caller has to opt-in (this route
// requires superadmin) and so we can return a count of what was removed.
// `cert_signatures` already has ON DELETE CASCADE and is cleaned up by the
// course delete.
//
// We also clean up the uploaded syllabus file (if any) since those are
// course-specific. Signature PNGs and custom logos are left in storage
// because they can be shared across courses; if you ever need to clean
// those up too, add a reference-count check first.
export async function DELETE(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const supabase = createServerSupabaseClient();

  // Grab the syllabus file URL before we delete the row so we can clean up
  // the storage object afterwards.
  const { data: courseRow } = await supabase
    .from('cert_courses')
    .select('syllabus_file_url')
    .eq('id', params.courseId)
    .maybeSingle();

  // Count certificates first so we can report it back to the UI.
  const { count: certCount, error: countErr } = await supabase
    .from('certificates')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', params.courseId);
  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  if ((certCount || 0) > 0) {
    const { error: certDelErr } = await supabase
      .from('certificates')
      .delete()
      .eq('course_id', params.courseId);
    if (certDelErr) {
      return NextResponse.json(
        { error: `Could not delete certificates: ${certDelErr.message}` },
        { status: 500 }
      );
    }
  }

  const { error } = await supabase.from('cert_courses').delete().eq('id', params.courseId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort cleanup of the syllabus file. Don't fail the request if it
  // can't be removed — the DB rows are already gone, the orphaned file is
  // cosmetic.
  const syllabusPath = extractStoragePath(courseRow?.syllabus_file_url);
  if (syllabusPath) {
    await supabase.storage.from('report-assets').remove([syllabusPath]).catch((err) => {
      console.warn('Failed to delete syllabus file', syllabusPath, err);
    });
  }

  return NextResponse.json({ ok: true, deleted_certificates: certCount || 0 });
}

// Extract a storage path from a Supabase public URL like
//   https://<proj>.supabase.co/storage/v1/object/public/report-assets/foo/bar.pdf
// returns "foo/bar.pdf". Returns null for any URL outside that bucket.
function extractStoragePath(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;
  const match = publicUrl.match(/\/report-assets\/(.+)$/);
  if (!match) return null;
  return match[1].split('?')[0];
}
