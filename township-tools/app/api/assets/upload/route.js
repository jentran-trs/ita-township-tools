import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const orgId = formData.get('orgId');
    const orgName = formData.get('orgName');
    const category = formData.get('category') || 'general';
    const description = formData.get('description') || '';
    const uploadedBy = formData.get('uploadedBy') || 'anonymous';

    if (!file || !orgId) {
      return NextResponse.json(
        { error: 'File and orgId are required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${orgId}/${category}/${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
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
      .from('assets')
      .getPublicUrl(filePath);

    // Save metadata to database
    const { data: assetData, error: dbError } = await supabase
      .from('assets')
      .insert({
        org_id: orgId,
        org_name: orgName,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        category,
        description,
        uploaded_by: uploadedBy
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save asset metadata', details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      asset: {
        ...assetData,
        url: urlData.publicUrl
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
