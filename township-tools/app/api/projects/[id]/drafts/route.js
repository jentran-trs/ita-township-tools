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

// GET - Get the latest draft for a project
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Get the most recent draft for this project
    const { data: draft, error } = await supabase
      .from('report_drafts')
      .select('*')
      .eq('project_id', id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is OK
      // PGRST205 = table doesn't exist, return null gracefully
      if (error.code === 'PGRST205') {
        return NextResponse.json({ draft: null });
      }
      console.error('Error fetching draft:', error);
      return NextResponse.json(
        { error: 'Failed to fetch draft' },
        { status: 500 }
      );
    }

    return NextResponse.json({ draft: draft || null });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// POST - Save a new draft or update existing
export async function POST(request, { params }) {
  try {
    const authData = await getAuthData();
    const userId = authData?.userId || 'anonymous';

    const { id } = await params;
    const body = await request.json();
    const { name, data } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'Report data is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Check if a draft already exists for this project
    const { data: existingDraft } = await supabase
      .from('report_drafts')
      .select('id')
      .eq('project_id', id)
      .limit(1)
      .single();

    let result;

    if (existingDraft) {
      // Update existing draft
      result = await supabase
        .from('report_drafts')
        .update({
          name: name || 'Untitled Draft',
          data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDraft.id)
        .select()
        .single();
    } else {
      // Create new draft
      result = await supabase
        .from('report_drafts')
        .insert({
          project_id: id,
          name: name || 'Untitled Draft',
          data,
          created_by: userId,
        })
        .select()
        .single();
    }

    if (result.error) {
      // If table doesn't exist, return a helpful message
      if (result.error.code === 'PGRST205' || result.error.code === '42P01') {
        return NextResponse.json(
          { error: 'Draft feature not available - database table not created yet' },
          { status: 503 }
        );
      }
      console.error('Error saving draft:', result.error);
      return NextResponse.json(
        { error: 'Failed to save draft', details: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      draft: result.data,
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete draft for a project
export async function DELETE(request, { params }) {
  try {
    const authData = await getAuthData();
    const userId = authData?.userId;

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('report_drafts')
      .delete()
      .eq('project_id', id);

    if (error) {
      console.error('Error deleting draft:', error);
      return NextResponse.json(
        { error: 'Failed to delete draft' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
