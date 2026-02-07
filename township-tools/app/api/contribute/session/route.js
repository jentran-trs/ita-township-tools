import { createServerSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// POST - Create or retrieve a contributor session for Clerk members
export async function POST(request) {
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
    const { shareId } = body;

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get the project by share ID
    const { data: project, error: projectError } = await supabase
      .from('report_projects')
      .select('id, name, finalized_at')
      .eq('share_id', shareId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if project is finalized
    if (project.finalized_at) {
      return NextResponse.json(
        { error: 'This project has been finalized and is no longer accepting contributions' },
        { status: 403 }
      );
    }

    // Check for existing session for this user and project
    const { data: existingSession, error: existingError } = await supabase
      .from('contributor_sessions')
      .select('*')
      .eq('project_id', project.id)
      .eq('clerk_user_id', userId)
      .single();

    if (existingSession) {
      // Return existing session
      return NextResponse.json({
        session: {
          id: existingSession.id,
          projectId: existingSession.project_id,
          status: existingSession.status,
          draftData: existingSession.draft_data,
          createdAt: existingSession.created_at,
          updatedAt: existingSession.updated_at,
          submissionId: existingSession.submission_id,
        },
        isNew: false,
      });
    }

    // Create new session
    const { data: newSession, error: createError } = await supabase
      .from('contributor_sessions')
      .insert({
        project_id: project.id,
        clerk_user_id: userId,
        draft_data: {},
        status: 'drafting',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating session:', createError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session: {
        id: newSession.id,
        projectId: newSession.project_id,
        status: newSession.status,
        draftData: newSession.draft_data,
        createdAt: newSession.created_at,
        updatedAt: newSession.updated_at,
        submissionId: newSession.submission_id,
      },
      isNew: true,
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// GET - Get session by ID or for current user
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
    const sessionId = searchParams.get('sessionId');

    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('contributor_sessions')
      .select('*')
      .eq('clerk_user_id', userId);

    if (sessionId) {
      query = query.eq('id', sessionId);
    } else if (shareId) {
      // Get project ID from share ID
      const { data: project } = await supabase
        .from('report_projects')
        .select('id')
        .eq('share_id', shareId)
        .single();

      if (project) {
        query = query.eq('project_id', project.id);
      } else {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
    }

    const { data: session, error } = await query.single();

    if (error || !session) {
      return NextResponse.json(
        { session: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      session: {
        id: session.id,
        projectId: session.project_id,
        status: session.status,
        draftData: session.draft_data,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        submissionId: session.submission_id,
      },
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
