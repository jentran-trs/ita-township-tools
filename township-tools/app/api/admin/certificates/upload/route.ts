import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { requireSuperadmin } from '../../../../../lib/auth/superadmin';

export const runtime = 'nodejs';
export const maxDuration = 30;

const ALLOWED_KINDS = new Set(['signature', 'logo', 'syllabus']);
const SIGNATURE_MIME = 'image/png';
const LOGO_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const SYLLABUS_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
]);
const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 MB for signatures/logos
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB for syllabus files

function extractStoragePath(publicUrl: string | null) {
  if (!publicUrl) return null;
  const match = publicUrl.match(/\/report-assets\/(.+)$/);
  if (!match) return null;
  return match[1].split('?')[0];
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'file';
}

// POST  multipart/form-data
//   file     File         the upload
//   kind     'signature' | 'logo'
//   prefix   string       optional folder prefix under certificates/ (default by kind)
//   oldUrl   string?      previous URL to delete on success
export async function POST(req: Request) {
  const sErr = await requireSuperadmin();
  if (sErr) return sErr;

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const kind = (form.get('kind') as string | null) || '';
  const oldUrl = (form.get('oldUrl') as string | null) || null;
  const prefix = (form.get('prefix') as string | null) || null;

  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: `kind must be one of ${Array.from(ALLOWED_KINDS).join(', ')}` }, { status: 400 });
  }
  const maxBytes = kind === 'syllabus' ? DOCUMENT_MAX_BYTES : IMAGE_MAX_BYTES;
  const maxLabel = kind === 'syllabus' ? '10 MB' : '2 MB';
  if (file.size > maxBytes) {
    return NextResponse.json({ error: `File too large (max ${maxLabel})` }, { status: 400 });
  }
  if (kind === 'signature' && file.type !== SIGNATURE_MIME) {
    return NextResponse.json(
      { error: 'Signature must be a PNG (transparent background recommended).' },
      { status: 400 }
    );
  }
  if (kind === 'logo' && !LOGO_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: 'Logo must be a PNG, JPEG, or WebP image.' },
      { status: 400 }
    );
  }
  if (kind === 'syllabus' && !SYLLABUS_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: 'Syllabus must be a PDF or Word (.doc/.docx) file.' },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const folder =
    prefix?.trim() ||
    (kind === 'signature'
      ? 'certificates/signatures'
      : kind === 'syllabus'
      ? 'certificates/syllabi'
      : 'certificates/logos');
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const ts = Date.now();
  const filename = `${ts}-${safeFileName(file.name)}`;
  const filePath = `${cleanFolder}/${filename}`;

  const supabase = createServerSupabaseClient();
  const { error: upErr } = await supabase.storage
    .from('report-assets')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('report-assets').getPublicUrl(filePath);

  // Delete old file if its path is in our bucket
  if (oldUrl) {
    const oldPath = extractStoragePath(oldUrl);
    if (oldPath && oldPath !== filePath) {
      await supabase.storage.from('report-assets').remove([oldPath]).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, url: urlData.publicUrl, path: filePath });
}
