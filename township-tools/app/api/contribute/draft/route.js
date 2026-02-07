import { createServerSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// PUT - Save draft data for a Clerk member's session
export async function PUT(request) {
  try {
    const authData = await auth();
    const { userId } = authData;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, shareId, draftData } = body;

    if (!draftData) {
      return NextResponse.json(
        { error: 'Draft data is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Find the session (by ID or by shareId + userId)
    let session;

    if (sessionId) {
      const { data, error } = await supabase
        .from('contributor_sessions')
        .select('id, project_id, status, clerk_user_id')
        .eq('id', sessionId)
        .eq('clerk_user_id', userId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      session = data;
    } else if (shareId) {
      // Get project first
      const { data: project } = await supabase
        .from('report_projects')
        .select('id, finalized_at')
        .eq('share_id', shareId)
        .single();

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      if (project.finalized_at) {
        return NextResponse.json(
          { error: 'Project is finalized' },
          { status: 403 }
        );
      }

      // Find or create session
      const { data: existingSession } = await supabase
        .from('contributor_sessions')
        .select('id, project_id, status, clerk_user_id')
        .eq('project_id', project.id)
        .eq('clerk_user_id', userId)
        .single();

      if (existingSession) {
        session = existingSession;
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('contributor_sessions')
          .insert({
            project_id: project.id,
            clerk_user_id: userId,
            draft_data: draftData,
            status: 'drafting',
          })
          .select('id, project_id, status, clerk_user_id')
          .single();

        if (createError) {
          console.error('Error creating session:', createError);
          return NextResponse.json(
            { error: 'Failed to create session' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          sessionId: newSession.id,
          message: 'Session created and draft saved',
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Session ID or Share ID is required' },
        { status: 400 }
      );
    }

    // Check if session is already submitted
    if (session.status === 'submitted') {
      return NextResponse.json(
        { error: 'Cannot update draft for submitted session' },
        { status: 403 }
      );
    }

    // Update the draft data
    const { error: updateError } = await supabase
      .from('contributor_sessions')
      .update({
        draft_data: draftData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('Error saving draft:', updateError);
      return NextResponse.json(
        { error: 'Failed to save draft' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      message: 'Draft saved',
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// GET - Get draft data for a session
export async function GET(request) {
  try {
    const authData = await auth();
    const { userId } = authData;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get project
    const { data: project } = await supabase
      .from('report_projects')
      .select('id')
      .eq('share_id', shareId)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get session
    const { data: session } = await supabase
      .from('contributor_sessions')
      .select('id, draft_data, status, submission_id')
      .eq('project_id', project.id)
      .eq('clerk_user_id', userId)
      .single();

    if (!session) {
      return NextResponse.json({
        session: null,
        draftData: null,
      });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        submissionId: session.submission_id,
      },
      draftData: session.draft_data,
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
