import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
};

// GET - Get project by share ID (public)
export async function GET(request, { params }) {
  try {
    const { shareId } = await params;
    const supabase = createServerSupabaseClient();

    const { data: project, error } = await supabase
      .from('report_projects')
      .select('id, name, organization_name, description, year, status, allow_public_submissions, finalized_at, finalized_by')
      .eq('share_id', shareId)
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404, headers: noCacheHeaders }
      );
    }

    if (!project.allow_public_submissions) {
      return NextResponse.json(
        { error: 'This project is not accepting submissions' },
        { status: 403, headers: noCacheHeaders }
      );
    }

    return NextResponse.json({ project }, { headers: noCacheHeaders });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
