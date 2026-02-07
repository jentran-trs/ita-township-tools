import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

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
        { status: 404 }
      );
    }

    if (!project.allow_public_submissions) {
      return NextResponse.json(
        { error: 'This project is not accepting submissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({ project });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
