import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Helper to extract storage path from a Supabase public URL
function extractStoragePath(publicUrl) {
  if (!publicUrl) return null;
  try {
    // URL format: https://xxx.supabase.co/storage/v1/object/public/report-assets/path/to/file.ext
    const match = publicUrl.match(/\/report-assets\/(.+)$/);
    if (match) {
      // Remove any query params (like ?v=timestamp)
      return match[1].split('?')[0];
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const path = formData.get('path');
    const oldUrl = formData.get('oldUrl'); // Optional: URL of old file to delete

    if (!file || !path) {
      return NextResponse.json(
        { error: 'File and path are required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get file extension
    const fileExt = file.name.split('.').pop();
    const filePath = `${path}.${fileExt}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('report-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('report-assets')
      .getPublicUrl(filePath);

    // Delete old file if provided and different from new file
    if (oldUrl) {
      const oldPath = extractStoragePath(oldUrl);
      if (oldPath && oldPath !== filePath) {
        const { error: deleteError } = await supabase.storage
          .from('report-assets')
          .remove([oldPath]);

        if (deleteError) {
          // Log but don't fail - the upload succeeded
          console.warn('Failed to delete old file:', oldPath, deleteError.message);
        } else {
          console.log('Deleted old file:', oldPath);
        }
      }
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
