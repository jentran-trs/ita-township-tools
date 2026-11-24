import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireSuperadmin } from '@/lib/auth/superadmin';
import { adminName } from '@/lib/badges/admin-name';
import { listPrintFiles, MAX_PRINT_FILE_BYTES, PRINT_FILES_BUCKET, setPrinted } from '@/lib/badges/print-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteParams = { params: { courseId: string } };

// GET — the event's files to print, with download links.
export async function GET(_req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const supabase = createServerSupabaseClient();
  return NextResponse.json({ files: await listPrintFiles(supabase, params.courseId) });
}

// POST { file_name, size_bytes, content_type, copies } — start an upload. The
// browser then sends the file straight to storage with the returned token
// (big PDFs don't fit through a Vercel function) and PATCHes { uploaded: true }.
export async function POST(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const b = await req.json().catch(() => null);
  const name = String(b?.file_name || '').trim().slice(0, 200);
  const size = Number(b?.size_bytes) || 0;
  if (!name) return NextResponse.json({ error: 'Missing file name' }, { status: 400 });
  if (size > MAX_PRINT_FILE_BYTES) return NextResponse.json({ error: 'Files must be 50 MB or smaller' }, { status: 400 });
  const copies = Math.max(0, Math.min(10000, Math.round(Number(b?.copies) || 1)));

  const supabase = createServerSupabaseClient();
  const { data: course } = await supabase.from('cert_courses').select('id').eq('id', params.courseId).maybeSingle();
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

  const safe = name.replace(/[^A-Za-z0-9._ -]+/g, '_').replace(/\s+/g, '_');
  const { data: row, error } = await supabase
    .from('cert_print_files')
    .insert({ course_id: course.id, file_name: name, storage_path: 'pending', content_type: String(b?.content_type || '') || null, size_bytes: size || null, copies, paper_size: String(b?.paper_size || '').trim().slice(0, 80) || null })
    .select('id')
    .single();
  if (error || !row) return NextResponse.json({ error: error?.message || 'Could not start upload' }, { status: 500 });
  const path = `${course.id}/${row.id}/${safe}`;
  await supabase.from('cert_print_files').update({ storage_path: path }).eq('id', row.id);
  const { data: up, error: upErr } = await supabase.storage.from(PRINT_FILES_BUCKET).createSignedUploadUrl(path);
  if (upErr || !up) {
    await supabase.from('cert_print_files').delete().eq('id', row.id);
    return NextResponse.json({ error: upErr?.message || 'Could not start upload' }, { status: 500 });
  }
  return NextResponse.json({ id: row.id, bucket: PRINT_FILES_BUCKET, path, token: up.token });
}

// PATCH { id, copies? , paper_size? , uploaded? , printed? }
export async function PATCH(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const b = await req.json().catch(() => null);
  if (!b?.id) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  const supabase = createServerSupabaseClient();
  if (typeof b.printed === 'boolean') {
    const { error } = await setPrinted(supabase, params.courseId, String(b.id), b.printed, await adminName());
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const patch: Record<string, any> = {};
  if (b.copies !== undefined) patch.copies = Math.max(0, Math.min(10000, Math.round(Number(b.copies) || 0)));
  if (b.uploaded === true) patch.uploaded = true;
  if (b.paper_size !== undefined) patch.paper_size = String(b.paper_size || '').trim().slice(0, 80) || null;
  if (Object.keys(patch).length) {
    const { error } = await supabase.from('cert_print_files').update(patch).eq('id', String(b.id)).eq('course_id', params.courseId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE ?id= — remove the file from storage and the list.
export async function DELETE(req: Request, { params }: RouteParams) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  const supabase = createServerSupabaseClient();
  const { data: row } = await supabase.from('cert_print_files').select('storage_path').eq('id', id).eq('course_id', params.courseId).maybeSingle();
  if (!row) return NextResponse.json({ error: 'File not found' }, { status: 404 });
  await supabase.storage.from(PRINT_FILES_BUCKET).remove([row.storage_path]).catch(() => {});
  await supabase.from('cert_print_files').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
