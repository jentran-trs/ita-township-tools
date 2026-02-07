import { createServerSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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
    const authData = await auth();
    const { searchParams } = new URL(request.url);

    // Use orgId from auth, fallback to query param
    const orgId = authData.orgId || searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization required' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: projects, error } = await supabase
      .from('report_projects')
      .select(`
        *,
        report_submissions(count),
        contributor_sessions(status)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    // Compute display status - use project.status if set, otherwise derive from sessions
    const projectsWithStatus = (projects || []).map(project => {
      // If project has a manual status set, use that
      if (project.status && project.status !== 'not_started') {
        return { ...project, derived_status: project.status };
      }

      // Otherwise derive from contributor sessions
      const sessions = project.contributor_sessions || [];
      let derived_status = 'collecting_assets';
      if (sessions.some(s => s.status === 'submitted')) {
        derived_status = 'collecting_assets';
      } else if (sessions.some(s => s.status === 'drafting')) {
        derived_status = 'collecting_assets';
      }
      return { ...project, derived_status };
    });

    return NextResponse.json({ projects: projectsWithStatus });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new project
export async function POST(request) {
  try {
    const authData = await auth();
    const body = await request.json();
    const { name, organizationName, description, year, orgId: clientOrgId } = body;

    // Use orgId from auth, fallback to client-provided orgId
    const orgId = authData.orgId || clientOrgId;
    const userId = authData.userId;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization required' },
        { status: 401 }
      );
    }

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
