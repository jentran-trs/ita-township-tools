import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'email-builder-logos';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']);

// POST — upload a new logo. Returns { url, path }. The `path` is what the
// client stores so it can later call DELETE to remove this specific file.
export async function POST(request) {
  try {
    const authData = await auth();
    if (!authData?.userId) {
      return NextResponse.json({ error: 'Sign in to upload a logo.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Use a PNG, JPG, GIF, WebP, or SVG image.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be 5 MB or smaller.' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const ext = (file.name?.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const rand = Math.random().toString(36).slice(2, 8);
    const filePath = `${authData.userId}/${Date.now()}-${rand}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType: file.type, upsert: false });
    if (uploadError) {
      return NextResponse.json({ error: 'Upload failed.', details: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return NextResponse.json({ url: urlData.publicUrl, path: filePath });
  } catch (err) {
    return NextResponse.json({ error: 'Server error.', details: err.message }, { status: 500 });
  }
}

// DELETE — remove a previously-uploaded logo from Supabase storage.
// Body: { path: string }. Verifies that the path starts with the current
// Clerk user's ID prefix, so users can only delete their own files.
export async function DELETE(request) {
  try {
    const authData = await auth();
    if (!authData?.userId) {
      return NextResponse.json({ error: 'Sign in to delete a logo.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const filePath = (body?.path || '').toString();
    if (!filePath) {
      return NextResponse.json({ error: 'No path provided.' }, { status: 400 });
    }
    // Defense in depth: a user must only be able to delete files inside their
    // own userId folder. Reject anything that doesn't match the prefix.
    if (!filePath.startsWith(`${authData.userId}/`)) {
      return NextResponse.json({ error: 'You can only delete your own logos.' }, { status: 403 });
    }

    const supabase = createServerSupabaseClient();
    const { error: deleteError } = await supabase.storage.from(BUCKET).remove([filePath]);
    if (deleteError) {
      return NextResponse.json({ error: 'Delete failed.', details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error.', details: err.message }, { status: 500 });
  }
}
