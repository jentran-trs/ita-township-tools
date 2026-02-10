import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Helper to safely get auth data (returns null if Clerk not configured)
async function getAuthData() {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    return await auth();
  } catch (error) {
    console.log('Clerk auth not available:', error.message);
    return null;
  }
}

// GET - Get project details with all submissions
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('report_projects')
      .select('*')
      .eq('id', id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get all submissions for this project
    const { data: submissions, error: submissionsError } = await supabase
      .from('report_submissions')
      .select(`
        *,
        report_sections(
          *,
          report_section_stats(*)
        )
      `)
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
    }

    return NextResponse.json({
      project,
      submissions: submissions || [],
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update project
export async function PATCH(request, { params }) {
  try {
    const authData = await getAuthData();
    const { id } = await params;
    const body = await request.json();

    // Use orgId from auth, fallback to request body, allow without auth for now
    const { orgId: bodyOrgId, ...updateFields } = body;
    const orgId = authData?.orgId || bodyOrgId;

    const supabase = createServerSupabaseClient();

    const { data: project, error } = await supabase
      .from('report_projects')
      .update({
        ...updateFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
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

// DELETE - Delete project and all related data including images
export async function DELETE(request, { params }) {
  try {
    const authData = await getAuthData();
    const userId = authData?.userId;
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Check user role for admin access via organization membership
    const orgRole = authData?.sessionClaims?.o?.rol;
    const isAdmin = orgRole === 'admin' || orgRole === 'org:admin';

    // Use orgId from auth, fallback to query param
    const orgId = authData?.orgId || searchParams.get('orgId');

    // When no auth available, allow delete (for development/staging without Clerk Pro)
    const noAuthAvailable = !authData;

    const supabase = createServerSupabaseClient();

    // For admins or when no auth, allow deleting any project; otherwise verify org ownership
    let projectQuery = supabase
      .from('report_projects')
      .select('id, org_id')
      .eq('id', id);

    if (!isAdmin && !noAuthAvailable && orgId) {
      projectQuery = projectQuery.eq('org_id', orgId);
    }

    const { data: project, error: projectError } = await projectQuery.single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get all submissions with their images to delete from storage
    const { data: submissions } = await supabase
      .from('report_submissions')
      .select(`
        id,
        logo_url,
        letter_headshot_url,
        letter_image1_url,
        letter_image2_url,
        report_sections(
          image_urls
        )
      `)
      .eq('project_id', id);

    // Collect all image URLs to delete from storage
    const imageUrls = [];
    if (submissions) {
      for (const sub of submissions) {
        if (sub.logo_url) imageUrls.push(sub.logo_url);
        if (sub.letter_headshot_url) imageUrls.push(sub.letter_headshot_url);
        if (sub.letter_image1_url) imageUrls.push(sub.letter_image1_url);
        if (sub.letter_image2_url) imageUrls.push(sub.letter_image2_url);

        if (sub.report_sections) {
          for (const section of sub.report_sections) {
            if (section.image_urls && Array.isArray(section.image_urls)) {
              imageUrls.push(...section.image_urls);
            }
          }
        }
      }
    }

    // Delete images from Supabase storage
    if (imageUrls.length > 0) {
      // Extract file paths from URLs
      // URLs look like: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
      const filePaths = imageUrls
        .map(url => {
          try {
            const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
            return match ? match[1] : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (filePaths.length > 0) {
        // Try to delete from the assets bucket
        const { error: storageError } = await supabase.storage
          .from('assets')
          .remove(filePaths);

        if (storageError) {
          console.error('Error deleting some files from storage:', storageError);
          // Continue with deletion even if some files fail
        }
      }
    }

    // Clear contributor_session_id references from submissions before deleting sessions
    const { data: sessions } = await supabase
      .from('contributor_sessions')
      .select('id')
      .eq('project_id', id);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      await supabase
        .from('report_submissions')
        .update({ contributor_session_id: null })
        .in('contributor_session_id', sessionIds);
    }

    // Now safe to delete contributor sessions
    await supabase
      .from('contributor_sessions')
      .delete()
      .eq('project_id', id);

    // Delete the project (submissions, sections, stats will cascade due to FK constraints)
    let deleteQuery = supabase
      .from('report_projects')
      .delete()
      .eq('id', id);

    if (!isAdmin) {
      deleteQuery = deleteQuery.eq('org_id', orgId);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedImages: imageUrls.length,
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
