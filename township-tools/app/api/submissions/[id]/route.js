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

// Helper to safely get current user
async function getCurrentUser() {
  try {
    const { currentUser } = await import('@clerk/nextjs/server');
    return await currentUser();
  } catch (error) {
    console.log('Clerk currentUser not available:', error.message);
    return null;
  }
}

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Get a single submission by ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Get submission with all related data
    const { data: submission, error } = await supabase
      .from('report_submissions')
      .select(`
        *,
        report_sections(
          *,
          report_section_stats(*)
        )
      `)
      .eq('id', id)
      .order('section_order', { referencedTable: 'report_sections', ascending: true })
      .single();

    if (error || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Debug: Log sections data to verify image_urls are returned
    console.log('GET /api/submissions/[id] - sections data:',
      submission.report_sections?.map(s => ({
        id: s.id,
        title: s.title,
        image_urls: s.image_urls,
        image_urls_type: typeof s.image_urls,
        image_urls_length: Array.isArray(s.image_urls) ? s.image_urls.length : 'not array',
      }))
    );

    // Return with no-cache headers to ensure fresh data
    return NextResponse.json({ submission }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
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

// PUT - Update a submission
export async function PUT(request, { params }) {
  console.log('PUT /api/submissions/[id] called');
  try {
    const authData = await getAuthData();
    const { id } = await params;
    console.log('Submission ID from params:', id);

    const body = await request.json();
    const { cover, letter, footer, review } = body;
    console.log('Request body received:', { cover: !!cover, letter: !!letter, footer: !!footer, review: !!review });

    const supabase = createServerSupabaseClient();
    console.log('Supabase client created');

    // Verify the submission exists and user has permission
    // Try with clerk_user_id first, fall back to without it if column doesn't exist
    let existing = null;
    let fetchError = null;

    const { data: data1, error: error1 } = await supabase
      .from('report_submissions')
      .select('id, submitter_email, clerk_user_id')
      .eq('id', id)
      .single();

    if (error1?.code === '42703') {
      // Column doesn't exist, try without clerk_user_id
      console.log('clerk_user_id column not found, querying without it');
      const { data: data2, error: error2 } = await supabase
        .from('report_submissions')
        .select('id, submitter_email')
        .eq('id', id)
        .single();
      existing = data2;
      fetchError = error2;
    } else {
      existing = data1;
      fetchError = error1;
    }

    console.log('PUT submission lookup:', { id, existing, fetchError });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Submission not found', details: fetchError.message },
        { status: 404 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Check permission: must match clerk_user_id, submitter_email, or be admin
    // When Clerk is not available, allow edits (for development/staging)
    const userId = authData?.userId;

    // Get user email from currentUser()
    const user = await getCurrentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;

    // Check for admin role - Clerk stores org role in sessionClaims.o.rol
    const orgRole = authData?.sessionClaims?.o?.rol;
    const isAdmin = orgRole === 'admin' || orgRole === 'org:admin';

    // If no auth available at all, allow edit (for production without Clerk Pro)
    const noAuthAvailable = !authData && !user;

    const canEdit =
      noAuthAvailable ||
      isAdmin ||
      (userId && existing.clerk_user_id === userId) ||
      (userEmail && existing.submitter_email?.toLowerCase() === userEmail?.toLowerCase());

    console.log('Permission check:', { userEmail, orgRole, isAdmin, noAuthAvailable, submitterEmail: existing.submitter_email, canEdit });

    if (!canEdit) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this submission' },
        { status: 403 }
      );
    }

    // Update the submission
    console.log('Updating submission with letter data:', {
      letterTitle: letter?.letterTitle,
      letterSubtitle: letter?.letterSubtitle,
      letterContentLength: letter?.letterContent?.length,
    });

    const updateData = {
      organization_name: cover?.organizationName,
      report_name: cover?.reportName,
      tagline: cover?.tagline,
      include_opening_letter: letter?.includeOpeningLetter,
      letter_title: letter?.letterTitle,
      letter_subtitle: letter?.letterSubtitle,
      letter_content: letter?.letterContent,
      letter_image1_caption: letter?.letterImage1Caption,
      letter_image2_caption: letter?.letterImage2Caption,
      department: footer?.department,
      street_address: footer?.streetAddress,
      city_state_zip: footer?.cityStateZip,
      phone: footer?.phone,
      email: footer?.email,
      website: footer?.website,
      submitter_name: review?.submitterName,
      submitter_email: review?.submitterEmail,
      additional_notes: review?.additionalNotes,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from('report_submissions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    console.log('Update result:', { success: !updateError, updatedSubtitle: updated?.letter_subtitle });

    if (updateError) {
      console.error('Error updating submission:', updateError);
      return NextResponse.json(
        { error: 'Failed to update submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, submission: updated });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a submission
export async function DELETE(request, { params }) {
  console.log('DELETE /api/submissions/[id] called');
  try {
    const authData = await getAuthData();
    const { id } = await params;

    const supabase = createServerSupabaseClient();

    // Get the submission to check permissions and get image URLs for cleanup
    const { data: submission, error: fetchError } = await supabase
      .from('report_submissions')
      .select(`
        id,
        submitter_email,
        clerk_user_id,
        logo_url,
        letter_headshot_url,
        letter_image1_url,
        letter_image2_url,
        report_sections(
          id,
          image_urls
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Check permission
    const user = await getCurrentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    const orgRole = authData?.sessionClaims?.o?.rol;
    const isAdmin = orgRole === 'admin' || orgRole === 'org:admin';
    const noAuthAvailable = !authData && !user;

    const canDelete =
      noAuthAvailable ||
      isAdmin ||
      (authData?.userId && submission.clerk_user_id === authData.userId) ||
      (userEmail && submission.submitter_email?.toLowerCase() === userEmail?.toLowerCase());

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this submission' },
        { status: 403 }
      );
    }

    // Collect all image URLs for storage cleanup
    const imageUrls = [];
    if (submission.logo_url) imageUrls.push(submission.logo_url);
    if (submission.letter_headshot_url) imageUrls.push(submission.letter_headshot_url);
    if (submission.letter_image1_url) imageUrls.push(submission.letter_image1_url);
    if (submission.letter_image2_url) imageUrls.push(submission.letter_image2_url);

    for (const section of submission.report_sections || []) {
      if (section.image_urls && Array.isArray(section.image_urls)) {
        imageUrls.push(...section.image_urls);
      }
    }

    // Delete stats first (foreign key constraint)
    const sectionIds = (submission.report_sections || []).map(s => s.id);
    if (sectionIds.length > 0) {
      await supabase
        .from('report_section_stats')
        .delete()
        .in('section_id', sectionIds);
    }

    // Delete sections
    await supabase
      .from('report_sections')
      .delete()
      .eq('submission_id', id);

    // Delete the submission
    const { error: deleteError } = await supabase
      .from('report_submissions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting submission:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete submission' },
        { status: 500 }
      );
    }

    // Try to delete images from storage (best effort, don't fail if this fails)
    if (imageUrls.length > 0) {
      const filePaths = imageUrls
        .map(url => {
          try {
            const match = url.match(/\/report-assets\/(.+?)(\?|$)/);
            return match ? match[1] : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (filePaths.length > 0) {
        await supabase.storage
          .from('report-assets')
          .remove(filePaths)
          .catch(err => console.warn('Failed to delete some images:', err));
      }
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
