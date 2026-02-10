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

// Generate a short, URL-friendly ID
function generateShareId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET - List all projects for the user's organization
export async function GET(request) {
  try {
    console.log('GET /api/projects - starting');
    const authData = await getAuthData();
    const { searchParams } = new URL(request.url);

    // Use orgId from auth, fallback to query param
    const orgId = authData?.orgId || searchParams.get('orgId');
    console.log('GET /api/projects - orgId:', orgId);

    // If no orgId, return all projects (for now, when auth not available)
    if (!orgId) {
      console.log('GET /api/projects - no orgId, fetching all projects');
      const supabase = createServerSupabaseClient();
      const { data: projects, error } = await supabase
        .from('report_projects')
        .select('*, report_submissions(count)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all projects:', error);
        return NextResponse.json(
          { error: 'Failed to fetch projects', details: error.message },
          { status: 500 }
        );
      }

      const projectsWithStatus = (projects || []).map(project => ({
        ...project,
        derived_status: project.status || 'collecting',
        submission_count: project.report_submissions?.[0]?.count || 0,
      }));

      return NextResponse.json({ projects: projectsWithStatus });
    }

    console.log('GET /api/projects - creating supabase client');
    const supabase = createServerSupabaseClient();
    console.log('GET /api/projects - supabase client created');

    // Query with submission count
    const { data: projects, error } = await supabase
      .from('report_projects')
      .select('*, report_submissions(count)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    console.log('Projects fetched successfully:', projects?.length || 0, 'projects');

    // Compute display status and extract submission count
    const projectsWithStatus = (projects || []).map(project => {
      const derived_status = project.status || 'collecting_assets';
      const submission_count = project.report_submissions?.[0]?.count || 0;
      return { ...project, derived_status, submission_count };
    });

    return NextResponse.json({ projects: projectsWithStatus });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error', message: error.message, stack: error.stack?.substring(0, 500) },
      { status: 500 }
    );
  }
}

// POST - Create a new project
export async function POST(request) {
  try {
    const authData = await getAuthData();
    const body = await request.json();
    const { name, organizationName, description, year, orgId: clientOrgId } = body;

    // Use orgId from auth, fallback to client-provided orgId
    const orgId = authData?.orgId || clientOrgId || 'default';
    const userId = authData?.userId || null;

    // Allow project creation without strict org requirement for now

    if (!name || !organizationName) {
      return NextResponse.json(
        { error: 'Name and organization name are required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Generate unique share ID
    let shareId = generateShareId();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('report_projects')
        .select('id')
        .eq('share_id', shareId)
        .single();

      if (!existing) break;
      shareId = generateShareId();
      attempts++;
    }

    const { data: project, error } = await supabase
      .from('report_projects')
      .insert({
        name,
        organization_name: organizationName,
        description,
        year,
        share_id: shareId,
        org_id: orgId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return NextResponse.json(
        { error: 'Failed to create project', details: error.message },
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
