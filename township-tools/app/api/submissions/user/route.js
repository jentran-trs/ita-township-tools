import { createServerSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// GET - Get submissions by user (matches by Clerk user ID or email)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    // Get Clerk user ID if logged in
    const authData = await auth();
    const clerkUserId = authData?.userId || null;

    if (!email && !clerkUserId) {
      return NextResponse.json(
        { error: 'Email or authentication required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Build query to match by either clerk_user_id OR email
    let query = supabase
      .from('report_submissions')
      .select('id, project_id, submitter_name, submitter_email, created_at, updated_at')
      .order('created_at', { ascending: false });

    // If we have a Clerk user ID, prioritize that
    if (clerkUserId) {
      // Try to get submissions by user ID first
      const { data: byUserId, error: userIdError } = await supabase
        .from('report_submissions')
        .select('id, project_id, submitter_name, submitter_email, created_at, updated_at')
        .eq('clerk_user_id', clerkUserId)
        .order('created_at', { ascending: false });

      if (!userIdError && byUserId && byUserId.length > 0) {
        return NextResponse.json({ submissions: byUserId });
      }
    }

    // Fall back to email matching
    if (email) {
      const { data: byEmail, error: emailError } = await supabase
        .from('report_submissions')
        .select('id, project_id, submitter_name, submitter_email, created_at, updated_at')
        .eq('submitter_email', email)
        .order('created_at', { ascending: false });

      if (emailError) {
        console.error('Error fetching submissions by email:', emailError);
        return NextResponse.json(
          { error: 'Failed to fetch submissions' },
          { status: 500 }
        );
      }

      return NextResponse.json({ submissions: byEmail || [] });
    }

    return NextResponse.json({ submissions: [] });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
