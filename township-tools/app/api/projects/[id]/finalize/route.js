import { createServerSupabaseClient } from '@/lib/supabase';
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// POST - Finalize a project (Clerk members only)
export async function POST(request, { params }) {
  try {
    const authData = await auth();
    const { userId, orgId } = authData;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Get the project first to verify ownership
    const { data: project, error: projectError } = await supabase
      .from('report_projects')
      .select('id, name, org_id, finalized_at')
      .eq('id', id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify user belongs to the org that owns the project
    if (project.org_id && project.org_id !== orgId) {
      return NextResponse.json(
        { error: 'You do not have permission to finalize this project' },
        { status: 403 }
      );
    }

    // Check if already finalized
    if (project.finalized_at) {
      return NextResponse.json(
        { error: 'Project is already finalized' },
        { status: 400 }
      );
    }

    // Get user info for the finalized_by field
    const user = await currentUser();
    const finalizedBy = user?.emailAddresses?.[0]?.emailAddress || userId;

    // Finalize the project
    const { data: updatedProject, error: updateError } = await supabase
      .from('report_projects')
      .update({
        finalized_at: new Date().toISOString(),
        finalized_by: finalizedBy,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error finalizing project:', updateError);
      return NextResponse.json(
        { error: 'Failed to finalize project' },
        { status: 500 }
      );
    }

    // Update all drafting sessions to reflect that form is closed
    await supabase
      .from('contributor_sessions')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', id)
      .eq('status', 'drafting');

    return NextResponse.json({
      success: true,
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        finalizedAt: updatedProject.finalized_at,
        finalizedBy: updatedProject.finalized_by,
        status: updatedProject.status,
      },
      message: 'Project has been finalized. No further submissions will be accepted.',
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// DELETE - Reopen a finalized project (undo finalization)
export async function DELETE(request, { params }) {
  try {
    const authData = await auth();
    const { userId, orgId } = authData;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Get the project first to verify ownership
    const { data: project, error: projectError } = await supabase
      .from('report_projects')
      .select('id, name, org_id, finalized_at')
      .eq('id', id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify user belongs to the org that owns the project
    if (project.org_id && project.org_id !== orgId) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this project' },
        { status: 403 }
      );
    }

    // Check if not finalized
    if (!project.finalized_at) {
      return NextResponse.json(
        { error: 'Project is not finalized' },
        { status: 400 }
      );
    }

    // Reopen the project
    const { data: updatedProject, error: updateError } = await supabase
      .from('report_projects')
      .update({
        finalized_at: null,
        finalized_by: null,
        status: 'collecting_assets',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error reopening project:', updateError);
      return NextResponse.json(
        { error: 'Failed to reopen project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        status: updatedProject.status,
      },
      message: 'Project has been reopened for submissions.',
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
