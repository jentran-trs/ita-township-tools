import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const category = searchParams.get('category');

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('assets')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: assets, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assets', details: error.message },
        { status: 500 }
      );
    }

    // Add public URLs to each asset
    const assetsWithUrls = assets.map(asset => {
      const { data: urlData } = supabase.storage
        .from('assets')
        .getPublicUrl(asset.file_path);

      return {
        ...asset,
        url: urlData.publicUrl
      };
    });

    return NextResponse.json({ assets: assetsWithUrls });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
