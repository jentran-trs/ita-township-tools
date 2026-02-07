import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET - List all submissions for a project by share ID
export async function GET(request, { params }) {
  try {
    const { shareId } = await params;
    const supabase = createServerSupabaseClient();

    // First, get the project by share ID
    const { data: project, error: projectError } = await supabase
      .from('report_projects')
      .select('id, name, organization_name, finalized_at')
      .eq('share_id', shareId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get all submissions for this project (excluding full content for privacy)
    const { data: submissions, error: submissionsError } = await supabase
      .from('report_submissions')
      .select(`
        id,
        created_at,
        submitter_name,
        organization_name,
        report_name,
        include_opening_letter,
        letter_title,
        logo_url,
        report_sections(
          id,
          title,
          section_order,
          image_urls,
          report_section_stats(
            id,
            label,
            value
          )
        )
      `)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    // Transform data to show summary info
    const summaries = (submissions || []).map(sub => {
      const totalImages = (sub.report_sections || []).reduce(
        (acc, s) => acc + (s.image_urls?.length || 0),
        0
      ) + (sub.logo_url ? 1 : 0);

      const totalStats = (sub.report_sections || []).reduce(
        (acc, s) => acc + (s.report_section_stats?.length || 0),
        0
      );

      return {
        id: sub.id,
        createdAt: sub.created_at,
        submitterName: sub.submitter_name,
        organizationName: sub.organization_name,
        reportName: sub.report_name,
        hasOpeningLetter: sub.include_opening_letter,
        letterTitle: sub.letter_title,
        logoUrl: sub.logo_url,
        sectionCount: (sub.report_sections || []).length,
        sections: (sub.report_sections || []).map(s => ({
          title: s.title,
          order: s.section_order,
          imageCount: s.image_urls?.length || 0,
          statCount: s.report_section_stats?.length || 0,
        })),
        totalImages,
        totalStats,
      };
    });

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        organizationName: project.organization_name,
        finalizedAt: project.finalized_at,
      },
      submissions: summaries,
      totalCount: summaries.length,
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
